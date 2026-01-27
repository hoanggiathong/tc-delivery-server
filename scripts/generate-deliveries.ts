/* eslint-disable no-console */
// Setup dynamic module alias first
import '../src/config/module-alias';

import { Delivery } from '@/models/delivery.model';
import { Route } from '@/models/route.model';
import { CodeGeneratorService } from '@/services/code-generator.service';
import { CustomerService } from '@/services/customer.service';
import { UserService } from '@/services/user.service';
import { IDeliveryCreateRequest } from '@/types/delivery.type';
import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';

/**
 * Script to generate delivery records using insertMany
 *
 * This script creates delivery records by:
 * 1. Preparing customers and validating routes (same logic as API)
 * 2. Generating unique codes for all records
 * 3. Creating all documents
 * 4. Using insertMany for bulk insert
 *
 * Requirements:
 * - MongoDB connection (via MONGODB_URI in .env)
 * - Valid user ID
 *
 * Usage:
 *   npx tsx scripts/generate-deliveries.ts
 *
 * Configuration:
 *   - TOTAL_RECORDS: Total number of records to create (default: 1000)
 *   - CODE_GENERATION_BATCH_SIZE: Number of codes to generate in parallel (default: 10)
 *   - INSERT_BATCH_SIZE: Number of documents to insert per batch (default: 1000)
 */

// Load environment variables based on NODE_ENV
const envFile =
  process.env.NODE_ENV === 'uat'
    ? '.env.uat'
    : process.env.NODE_ENV === 'production'
      ? '.env.production'
      : '.env';

dotenv.config({ path: envFile });

// User ID from JWT token
const USER_ID = '686096db7dfdeeb44d06f907';

// Base data from curl request
const BASE_DATA: IDeliveryCreateRequest = {
  senderName: 'Triển Văn Tránh',
  senderPhone: '+84933223322',
  receiverName: 'Quách Thị Quang',
  receiverPhone: '+849889988999',
  fromRouteId: '694e0d2bfdeb19c4c71f38ff',
  toRouteId: '694e0d2bfdeb19c4c71f3900',
  name: 'Máy tính bảng',
  quantity: 1,
  cost: 20000,
  homeDelivery: '',
  homeDeliveryCost: 0,
  carryCost: 0,
  itemValue: 100000,
  itemCost: 15000,
  collectCost: 0,
  collectForCustomer: 20000,
  collectForCustomerCost: 0,
  collectForCustomerNote: 'test data',
  notes: 'test data',
  details: {
    weight: 1,
    length: 0,
    width: 0,
    height: 0,
    isOverweight: false,
    goodsType: 'Hàng cân ký',
  },
  paymentType: 'debt',
  isFree: false,
  vehicleType: null,
  nameProductAndAdditionalInformation: 'Hàng điện tử, không bảo hành rơi vỡ. Nhẹ tay',
};

// Configuration
const TOTAL_RECORDS = 1000;
const CODE_GENERATION_BATCH_SIZE = 10; // Generate codes in small batches to avoid collisions
const INSERT_BATCH_SIZE = 1000; // Insert documents in batches

/**
 * Generate a random itemValue between min and max
 */
function generateRandomItemValue(min: number = 50000, max: number = 5000000): number {
  // Generate random item value in VND
  const random = Math.floor(Math.random() * (max - min + 1)) + min;
  // Round to nearest 1000
  return Math.round(random / 1000) * 1000;
}

/**
 * Generate codes in batches
 */
async function generateCodesBatch(
  count: number,
  toRouteId: string,
  fromRouteId: string
): Promise<Array<{ code: string; fullCode: string; subCode: string }>> {
  const codes: Array<{ code: string; fullCode: string; subCode: string }> = [];

  // Generate codes sequentially to ensure uniqueness
  for (let i = 0; i < count; i++) {
    const codeData = await CodeGeneratorService.generateNextCode(toRouteId, fromRouteId);
    codes.push(codeData);
  }

  return codes;
}

/**
 * Main function to generate all deliveries
 */
async function generateDeliveries() {
  try {
    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoURI);
    console.log('✅ MongoDB connected successfully\n');

    // Initialize services
    const customerService = new CustomerService();
    const userService = new UserService();

    // Step 1: Prepare customers and routes (same logic as createDelivery)
    console.log('📋 Step 1: Preparing customers and validating routes...');

    // Get fromRouteId: use BASE_DATA.fromRouteId if provided, otherwise get from user's selected route
    let fromRouteId = BASE_DATA.fromRouteId;
    if (!fromRouteId) {
      fromRouteId = await userService.getUserSelectedRouteId(USER_ID);
    }

    // Find or create sender and receiver (same logic as API)
    const sender = await customerService.findOrCreateCustomer(
      BASE_DATA.senderPhone,
      BASE_DATA.senderName,
      fromRouteId
    );
    const receiver = await customerService.findOrCreateCustomer(
      BASE_DATA.receiverPhone,
      BASE_DATA.receiverName,
      BASE_DATA.toRouteId
    );

    console.log(`✅ Sender: ${sender.name} (${sender.phone})`);
    console.log(`✅ Receiver: ${receiver.name} (${receiver.phone})`);

    // Validate fromRoute and toRoute exist (same logic as API)
    const [fromRoute, toRoute] = await Promise.all([
      Route.findById(fromRouteId),
      Route.findById(BASE_DATA.toRouteId),
    ]);

    if (!fromRoute) {
      throw new Error('User selected route not found');
    }
    if (!toRoute) {
      throw new Error('To route not found');
    }

    console.log(`✅ From Route: ${fromRoute.name} (${fromRoute.code})`);
    console.log(`✅ To Route: ${toRoute.name} (${toRoute.code})\n`);

    // Step 2: Generate all codes
    console.log('🔢 Step 2: Generating unique codes...');
    console.log(
      `   Generating ${TOTAL_RECORDS} codes (batch size: ${CODE_GENERATION_BATCH_SIZE})...`
    );

    const allCodes: Array<{ code: string; fullCode: string; subCode: string }> = [];
    const totalCodeBatches = Math.ceil(TOTAL_RECORDS / CODE_GENERATION_BATCH_SIZE);

    for (let i = 0; i < totalCodeBatches; i++) {
      const batchSize = Math.min(CODE_GENERATION_BATCH_SIZE, TOTAL_RECORDS - allCodes.length);
      const batchCodes = await generateCodesBatch(batchSize, BASE_DATA.toRouteId, fromRouteId);
      allCodes.push(...batchCodes);

      const progress = ((allCodes.length / TOTAL_RECORDS) * 100).toFixed(1);
      console.log(
        `   Progress: ${progress}% (${allCodes.length}/${TOTAL_RECORDS} codes generated)`
      );
    }

    console.log(`✅ All ${TOTAL_RECORDS} codes generated successfully\n`);

    // Step 3: Create all documents
    console.log('📝 Step 3: Creating documents...');

    const documents = allCodes.map(codeData => {
      const itemValue = generateRandomItemValue(50000, 5000000);
      const cost = BASE_DATA.cost;
      const itemCost = BASE_DATA.itemCost;
      const collectForCustomerCost = BASE_DATA.collectForCustomerCost || 0;
      const homeDeliveryCost = BASE_DATA.homeDeliveryCost || 0;
      const carryCost = BASE_DATA.carryCost || 0;
      const collectCost = BASE_DATA.collectCost || 0;
      const collectForCustomer = BASE_DATA.collectForCustomer || 0;
      const isFree = BASE_DATA.isFree || false;
      const homeDelivery = BASE_DATA.homeDelivery || undefined;

      // Calculate totalCost (same logic as pre-save middleware)
      // If isFree, totalCost = 0, otherwise totalCost = cost + itemCost + collectForCustomerCost + homeDeliveryCost
      const totalCost = isFree ? 0 : cost + itemCost + collectForCustomerCost + homeDeliveryCost;

      // Calculate actualRevenue (totalCost + collectCost + collectForCustomer)
      const actualRevenue = totalCost + collectCost + collectForCustomer;

      // Calculate homeDeliveryCostTotal (carryCost + homeDeliveryCost if homeDelivery exists)
      const homeDeliveryCostTotal =
        homeDelivery && homeDelivery.trim() !== '' ? carryCost + homeDeliveryCost : undefined;

      return {
        code: codeData.code,
        fullCode: codeData.fullCode,
        subCode: codeData.subCode,
        sender: new Types.ObjectId(sender._id),
        senderName: BASE_DATA.senderName,
        receiver: new Types.ObjectId(receiver._id),
        receiverName: BASE_DATA.receiverName,
        fromRoute: new Types.ObjectId(fromRouteId),
        toRoute: new Types.ObjectId(BASE_DATA.toRouteId),
        name: BASE_DATA.name,
        nameProductAndAdditionalInformation: BASE_DATA.nameProductAndAdditionalInformation,
        quantity: BASE_DATA.quantity || 1,
        cost,
        homeDelivery,
        homeDeliveryCost,
        carryCost,
        homeDeliveryCostTotal, // Calculate manually since insertMany doesn't run pre-save middleware
        vehicleType: BASE_DATA.vehicleType || undefined,
        itemValue,
        itemCost,
        collectCost,
        collectForCustomer,
        collectForCustomerCost,
        collectForCustomerNote: BASE_DATA.collectForCustomerNote || undefined,
        details: BASE_DATA.details || undefined,
        notes: BASE_DATA.notes || undefined,
        paymentType: BASE_DATA.paymentType || 'paid',
        isFree,
        totalCost, // Calculate manually since insertMany doesn't run pre-save middleware
        actualRevenue, // Calculate manually since insertMany doesn't run pre-save middleware
        createdByUser: new Types.ObjectId(USER_ID),
        // createdAt and updatedAt will be set automatically by Mongoose timestamps
      };
    });

    console.log(`✅ All ${TOTAL_RECORDS} documents created\n`);

    // Step 3.5: Check for duplicate fullCodes in the documents array
    console.log('🔍 Step 3.5: Checking for duplicate fullCodes...');
    const fullCodeSet = new Set<string>();
    const duplicates: string[] = [];
    documents.forEach((doc, idx) => {
      if (fullCodeSet.has(doc.fullCode)) {
        duplicates.push(`Index ${idx}: ${doc.fullCode}`);
      } else {
        fullCodeSet.add(doc.fullCode);
      }
    });
    if (duplicates.length > 0) {
      console.warn(`⚠️  Found ${duplicates.length} duplicate fullCodes in documents array:`);
      duplicates.slice(0, 10).forEach(dup => console.warn(`     - ${dup}`));
      if (duplicates.length > 10) {
        console.warn(`     ... and ${duplicates.length - 10} more`);
      }
    } else {
      console.log(`✅ No duplicate fullCodes found in ${documents.length} documents`);
    }
    console.log('');

    // Step 3.6: Test insert with one document first
    console.log('🧪 Step 3.6: Testing with one document first...');
    try {
      const testDoc = documents[0];
      const testResult = await Delivery.insertMany([testDoc], { ordered: false });
      console.log(`✅ Test insert successful! Document ID: ${testResult[0]._id}`);
      // Remove the test document from the array to avoid duplicate
      documents.shift();
      console.log(`   Removed test document, ${documents.length} documents remaining\n`);
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

    // Step 4: Filter out documents with existing fullCodes
    console.log('🔍 Step 4: Checking for existing fullCodes in database...');
    const fullCodesToCheck = documents.map(doc => doc.fullCode);
    const existingFullCodes = await Delivery.find({
      fullCode: { $in: fullCodesToCheck },
    })
      .select('fullCode')
      .lean();
    const existingFullCodeSet = new Set(existingFullCodes.map((doc: any) => doc.fullCode));
    const filteredDocuments = documents.filter(doc => !existingFullCodeSet.has(doc.fullCode));
    const skippedCount = documents.length - filteredDocuments.length;
    if (skippedCount > 0) {
      console.warn(`⚠️  Skipping ${skippedCount} documents with existing fullCodes in database`);
    }
    console.log(`✅ ${filteredDocuments.length} documents ready for insertion\n`);

    // Step 5: Insert documents using insertMany in batches
    console.log('💾 Step 5: Inserting documents into database...');
    console.log(`   Inserting in batches of ${INSERT_BATCH_SIZE}...`);

    const totalInsertBatches = Math.ceil(filteredDocuments.length / INSERT_BATCH_SIZE);
    let totalInserted = 0;
    let totalErrors = 0;
    const startTime = Date.now();

    for (let i = 0; i < totalInsertBatches; i++) {
      const startIndex = i * INSERT_BATCH_SIZE;
      const endIndex = Math.min(startIndex + INSERT_BATCH_SIZE, filteredDocuments.length);
      const batch = filteredDocuments.slice(startIndex, endIndex);

      try {
        const result = await Delivery.insertMany(batch, { ordered: false });
        totalInserted += result.length;
        const progress = ((totalInserted / filteredDocuments.length) * 100).toFixed(1);
        console.log(
          `   Batch ${i + 1}/${totalInsertBatches}: Inserted ${result.length} documents (${progress}%)`
        );
      } catch (error: any) {
        // Handle partial insert errors
        if (error.writeErrors && error.writeErrors.length > 0) {
          const insertedCount = error.insertedCount || 0;
          totalInserted += insertedCount;
          totalErrors += error.writeErrors.length;
          console.error(
            `   Batch ${i + 1}/${totalInsertBatches}: Partial insert - ${insertedCount} succeeded, ${error.writeErrors.length} failed`
          );
          // Log first few errors for debugging with full details
          error.writeErrors.slice(0, 5).forEach((err: any, idx: number) => {
            const errorMsg =
              err.errmsg || err.message || JSON.stringify(err).substring(0, 200) || 'Unknown error';
            const errorCode = err.code || 'N/A';
            const fullCode = err.op?.fullCode || 'N/A';
            console.error(
              `     Error ${idx + 1}: Code ${errorCode} - ${errorMsg} (fullCode: ${fullCode})`
            );
          });

          // Count duplicate key errors
          const duplicateErrors = error.writeErrors.filter(
            (err: any) => err.code === 11000 || err.errmsg?.includes('duplicate')
          );
          if (duplicateErrors.length > 0) {
            console.error(
              `     ⚠️  ${duplicateErrors.length} duplicate key errors (fullCode already exists)`
            );
          }
        } else {
          // Complete failure
          console.error(
            `   Batch ${i + 1}/${totalInsertBatches}: Failed to insert - ${error.message || JSON.stringify(error).substring(0, 200)}`
          );
          totalErrors += batch.length;
        }
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(50));
    console.log('📈 Summary:');
    console.log(`✅ Total records inserted: ${totalInserted}`);
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

    // Verify insertion by counting documents
    if (totalInserted > 0) {
      console.log('\n🔍 Verifying insertion...');
      const count = await Delivery.countDocuments({
        createdByUser: new Types.ObjectId(USER_ID),
        senderName: BASE_DATA.senderName,
        receiverName: BASE_DATA.receiverName,
      });
      console.log(`✅ Found ${count} delivery records in database`);
      if (count !== totalInserted) {
        console.warn(`⚠️  Warning: Expected ${totalInserted} records but found ${count}`);
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
generateDeliveries().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
