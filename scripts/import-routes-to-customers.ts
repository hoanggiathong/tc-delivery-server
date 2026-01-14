/* eslint-disable no-console */
// Setup dynamic module alias first
import '../src/config/module-alias';

import { Customer } from '@/models/customer.model';
import { Route } from '@/models/route.model';
import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';

/**
 * Script to import routes into customers table
 *
 * This script:
 * 1. Fetches all routes from Route model
 * 2. Extracts routeId, phone, name, address from each route
 * 3. Inserts into Customer table with isRoute = true
 *
 * Requirements:
 * - MongoDB connection (via MONGODB_URI in .env)
 * - Valid user ID
 *
 * Usage:
 *   npx tsx scripts/import-routes-to-customers.ts
 */

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

// User ID for createdBy
const USER_ID = '686096db7dfdeeb44d06f907';

/**
 * Generate a unique phone number if route doesn't have one
 */
function generatePhoneForRoute(routeCode: string, index: number): string {
  // Generate phone based on route code and index to ensure uniqueness
  const codeHash = routeCode
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
    .toString()
    .slice(-4);
  return `+849${String(index).padStart(6, '0')}${codeHash.slice(-2)}`;
}

/**
 * Main function to import routes to customers
 */
async function importRoutesToCustomers() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');

    // Step 1: Fetch all routes
    console.log('📋 Step 1: Fetching all routes...');
    const routes = await Route.find({}).select('_id code name address phone').lean();
    console.log(`✅ Found ${routes.length} routes\n`);

    if (routes.length === 0) {
      console.log('⚠️  No routes found. Exiting...');
      await mongoose.disconnect();
      return;
    }

    // Step 2: Prepare customer documents
    console.log('📝 Step 2: Preparing customer documents...');
    const customerDocuments = routes.map((route, index) => {
      // Use route phone if available, otherwise generate a unique phone
      let phone = route.phone;
      if (!phone || phone.trim() === '') {
        phone = generatePhoneForRoute(route.code, index);
        console.log(`   Route ${route.code}: Generated phone ${phone} (route has no phone)`);
      }

      return {
        name: route.name,
        phone: phone.trim(),
        routeId: new Types.ObjectId(route._id),
        address: route.address || null,
        isRoute: true,
        createdBy: new Types.ObjectId(USER_ID),
        // Other fields will use defaults from schema
        bankId: undefined,
        images: [],
        identityCardName: null,
        identityCardIssuedDate: null,
        identityCardNumber: null,
      };
    });

    console.log(`✅ Prepared ${customerDocuments.length} customer documents\n`);

    // Step 3: Check for existing customers with same phone numbers
    console.log('🔍 Step 3: Checking for existing customers with same phone numbers...');
    const phones = customerDocuments.map(doc => doc.phone);
    const existingCustomers = await Customer.find({
      phone: { $in: phones },
    })
      .select('phone')
      .lean();

    const existingPhoneSet = new Set(existingCustomers.map((c: any) => c.phone));
    const filteredDocuments = customerDocuments.filter(doc => !existingPhoneSet.has(doc.phone));
    const skippedCount = customerDocuments.length - filteredDocuments.length;

    if (skippedCount > 0) {
      console.warn(
        `⚠️  Skipping ${skippedCount} routes with existing phone numbers in customers table`
      );
      existingCustomers.forEach((c: any) => {
        const route = routes.find(r => {
          const doc = customerDocuments.find(d => d.phone === c.phone);
          return doc && doc.routeId.toString() === r._id.toString();
        });
        if (route) {
          console.warn(
            `     - Route ${route.code} (${route.name}): Phone ${c.phone} already exists`
          );
        }
      });
    }
    console.log(`✅ ${filteredDocuments.length} documents ready for insertion\n`);

    if (filteredDocuments.length === 0) {
      console.log('⚠️  No new customers to insert. All routes already exist as customers.');
      await mongoose.disconnect();
      return;
    }

    // Step 4: Test insert with one document first
    console.log('🧪 Step 4: Testing with one document first...');
    try {
      const testDoc = filteredDocuments[0];
      const testResult = await Customer.insertMany([testDoc], { ordered: false });
      console.log(`✅ Test insert successful! Customer ID: ${testResult[0]._id}`);
      // Remove the test document from the array to avoid duplicate
      filteredDocuments.shift();
      console.log(`   Removed test document, ${filteredDocuments.length} documents remaining\n`);
    } catch (error: any) {
      console.error('❌ Test insert failed! Error:', error.message);
      if (error.writeErrors && error.writeErrors.length > 0) {
        console.error('   Validation errors:');
        error.writeErrors.forEach((err: any) => {
          console.error(`     - ${err.errmsg || err.message}`);
        });
      }
      throw new Error('Test insert failed. Please check the error above.');
    }

    // Step 5: Insert remaining documents
    console.log('💾 Step 5: Inserting remaining documents...');
    const startTime = Date.now();
    let totalInserted = 0;
    let totalErrors = 0;

    try {
      const result = await Customer.insertMany(filteredDocuments, { ordered: false });
      totalInserted = result.length;
      console.log(`✅ Successfully inserted ${totalInserted} customers`);
    } catch (error: any) {
      // Handle partial insert errors
      if (error.writeErrors && error.writeErrors.length > 0) {
        const insertedCount = error.insertedCount || 0;
        totalInserted += insertedCount;
        totalErrors += error.writeErrors.length;
        console.error(
          `⚠️  Partial insert - ${insertedCount} succeeded, ${error.writeErrors.length} failed`
        );
        // Log first few errors for debugging
        error.writeErrors.slice(0, 5).forEach((err: any, idx: number) => {
          const errorMsg =
            err.errmsg || err.message || JSON.stringify(err).substring(0, 200) || 'Unknown error';
          const errorCode = err.code || 'N/A';
          const phone = err.op?.phone || 'N/A';
          console.error(`     Error ${idx + 1}: Code ${errorCode} - ${errorMsg} (phone: ${phone})`);
        });
      } else {
        // Complete failure
        console.error(
          `❌ Failed to insert - ${error.message || JSON.stringify(error).substring(0, 200)}`
        );
        totalErrors += filteredDocuments.length;
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary:');
    console.log(`✅ Total customers inserted: ${totalInserted}`);
    if (totalErrors > 0) {
      console.log(`❌ Total errors: ${totalErrors}`);
    }
    console.log(`⏱️  Total time: ${duration} seconds`);
    if (totalInserted > 0) {
      console.log(
        `📊 Average: ${(totalInserted / parseFloat(duration)).toFixed(2)} records/second`
      );
    }
    console.log('='.repeat(50));

    // Verify insertion by counting customers with isRoute = true
    if (totalInserted > 0) {
      console.log('\n🔍 Verifying insertion...');
      const count = await Customer.countDocuments({
        isRoute: true,
        createdBy: new Types.ObjectId(USER_ID),
      });
      console.log(`✅ Found ${count} customers with isRoute = true in database`);
      if (count !== totalInserted + 1) {
        // +1 for test document
        console.warn(`⚠️  Warning: Expected ${totalInserted + 1} records but found ${count}`);
      }
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
importRoutesToCustomers().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
