/* eslint-disable no-console */
// Setup dynamic module alias first
import '../src/config/module-alias';

import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';

/**
 * Script to update customer isRoute field based on route phone numbers
 *
 * This script:
 * 1. Fetches all routes and extracts their phone numbers
 * 2. Fetches all customers
 * 3. Updates customers:
 *    - If customer phone matches route phone → isRoute = true
 *    - Otherwise → isRoute = false
 *
 * Requirements:
 * - MongoDB connection (via MONGODB_URI in .env)
 *
 * Usage:
 *   npx tsx scripts/update-customer-isroute.ts
 */

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

/**
 * Main function to update customer isRoute field
 */
async function updateCustomerIsRoute() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');

    // Step 1: Fetch all routes and extract phone numbers
    console.log('📋 Step 1: Fetching all routes and extracting phone numbers...');
    const routes = await Route.find({})
      .select('_id code name phone')
      .lean();
    
    // Create a set of route phone numbers (normalize phone numbers for comparison)
    const routePhoneSet = new Set<string>();
    const routePhoneMap = new Map<string, { code: string; name: string }>();
    
    routes.forEach(route => {
      if (route.phone && route.phone.trim() !== '') {
        const normalizedPhone = route.phone.trim();
        routePhoneSet.add(normalizedPhone);
        routePhoneMap.set(normalizedPhone, {
          code: route.code,
          name: route.name,
        });
      }
    });
    
    console.log(`✅ Found ${routes.length} routes`);
    console.log(`✅ Found ${routePhoneSet.size} routes with phone numbers\n`);

    // Step 2: Fetch all customers
    console.log('📋 Step 2: Fetching all customers...');
    const customers = await Customer.find({}).select('_id name phone isRoute').lean();
    console.log(`✅ Found ${customers.length} customers\n`);

    if (customers.length === 0) {
      console.log('⚠️  No customers found. Exiting...');
      await mongoose.disconnect();
      return;
    }

    // Step 3: Identify customers to update
    console.log('🔍 Step 3: Identifying customers to update...');
    const customersToSetTrue: Array<{ id: string; phone: string; routeInfo: { code: string; name: string } }> = [];
    const customersToSetFalse: Array<{ id: string; phone: string; currentIsRoute: any }> = [];

    customers.forEach((customer: any) => {
      const customerPhone = customer.phone?.trim();
      if (!customerPhone) {
        // Customers without phone → should be isRoute = false
        if (customer.isRoute !== false) {
          customersToSetFalse.push({
            id: customer._id.toString(),
            phone: 'N/A (no phone)',
            currentIsRoute: customer.isRoute,
          });
        }
        return;
      }

      if (routePhoneSet.has(customerPhone)) {
        // Customer phone matches route phone → should be isRoute = true
        const routeInfo = routePhoneMap.get(customerPhone);
        if (customer.isRoute !== true) {
          customersToSetTrue.push({
            id: customer._id.toString(),
            phone: customerPhone,
            routeInfo: routeInfo || { code: 'N/A', name: 'N/A' },
          });
        }
      } else {
        // Customer phone doesn't match any route phone → should be isRoute = false
        // Update all customers that are not routes (including those without isRoute field)
        if (customer.isRoute !== false) {
          customersToSetFalse.push({
            id: customer._id.toString(),
            phone: customerPhone,
            currentIsRoute: customer.isRoute,
          });
        }
      }
    });

    console.log(`✅ Customers to set isRoute = true: ${customersToSetTrue.length}`);
    if (customersToSetTrue.length > 0) {
      console.log('   Customers matching route phones:');
      customersToSetTrue.slice(0, 10).forEach(c => {
        console.log(`     - ${c.phone} (Route: ${c.routeInfo.code} - ${c.routeInfo.name})`);
      });
      if (customersToSetTrue.length > 10) {
        console.log(`     ... and ${customersToSetTrue.length - 10} more`);
      }
    }

    console.log(`✅ Customers to set isRoute = false: ${customersToSetFalse.length}`);
    if (customersToSetFalse.length > 0) {
      console.log('   Customers not matching any route phone (will set isRoute = false):');
      customersToSetFalse.slice(0, 10).forEach(c => {
        const currentValue = c.currentIsRoute === undefined ? 'undefined' : c.currentIsRoute;
        console.log(`     - ${c.phone} (current: ${currentValue})`);
      });
      if (customersToSetFalse.length > 10) {
        console.log(`     ... and ${customersToSetFalse.length - 10} more`);
      }
    }
    console.log('');

    // Step 4: Update customers
    console.log('💾 Step 4: Updating customers...');
    const startTime = Date.now();
    let updatedTrue = 0;
    let updatedFalse = 0;
    let errors = 0;

    // Update customers to set isRoute = true
    if (customersToSetTrue.length > 0) {
      console.log(`   Setting isRoute = true for ${customersToSetTrue.length} customers...`);
      for (const customer of customersToSetTrue) {
        try {
          await Customer.updateOne({ _id: customer.id }, { $set: { isRoute: true } });
          updatedTrue++;
        } catch (error: any) {
          errors++;
          console.error(`     ❌ Failed to update customer ${customer.id}: ${error.message}`);
        }
      }
      console.log(`   ✅ Updated ${updatedTrue} customers to isRoute = true`);
    }

    // Update customers to set isRoute = false
    if (customersToSetFalse.length > 0) {
      console.log(`   Setting isRoute = false for ${customersToSetFalse.length} customers...`);
      
      // Use bulk update for better performance
      const BATCH_SIZE = 100;
      for (let i = 0; i < customersToSetFalse.length; i += BATCH_SIZE) {
        const batch = customersToSetFalse.slice(i, i + BATCH_SIZE);
        const customerIds = batch.map(c => new Types.ObjectId(c.id));
        
        try {
          const result = await Customer.updateMany(
            { _id: { $in: customerIds } },
            { $set: { isRoute: false } }
          );
          updatedFalse += result.modifiedCount;
        } catch (error: any) {
          errors++;
          console.error(`     ❌ Failed to update batch starting at index ${i}: ${error.message}`);
          // Fallback to individual updates
          for (const customer of batch) {
            try {
              await Customer.updateOne({ _id: customer.id }, { $set: { isRoute: false } });
              updatedFalse++;
            } catch (err: any) {
              errors++;
              console.error(`       ❌ Failed to update customer ${customer.id}: ${err.message}`);
            }
          }
        }
      }
      console.log(`   ✅ Updated ${updatedFalse} customers to isRoute = false`);
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary:');
    console.log(`✅ Customers set to isRoute = true: ${updatedTrue}`);
    console.log(`✅ Customers set to isRoute = false: ${updatedFalse}`);
    if (errors > 0) {
      console.log(`❌ Errors: ${errors}`);
    }
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log('='.repeat(50));

    // Verify updates
    console.log('\n🔍 Verifying updates...');
    const countTrue = await Customer.countDocuments({ isRoute: true });
    const countFalse = await Customer.countDocuments({ isRoute: false });
    const countNull = await Customer.countDocuments({ isRoute: { $exists: false } });
    console.log(`✅ Customers with isRoute = true: ${countTrue}`);
    console.log(`✅ Customers with isRoute = false: ${countFalse}`);
    if (countNull > 0) {
      console.log(`⚠️  Customers without isRoute field: ${countNull}`);
    }

    // Disconnect from MongoDB
    console.log('\n🔌 Disconnecting from MongoDB...');
    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected successfully');
    console.log('\n✅ All operations completed successfully');
  } catch (error) {
    console.error('❌ Fatal error:', error);
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

// Run the script
updateCustomerIsRoute().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

