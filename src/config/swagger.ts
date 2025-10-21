import swaggerJsdoc, { SwaggerDefinition } from 'swagger-jsdoc';

const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'TC Delivery Server API',
    version: '1.0.0',
    description: 'Express TypeScript API server with JWT authentication',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ReturnDeliveryResponse: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            example: '507f1f77bcf86cd799439011',
          },
          code: {
            type: 'string',
            example: 'TD001',
          },
          fullCode: {
            type: 'string',
            example: 'TD001-2024-001',
          },
          subCode: {
            type: 'string',
            example: '001',
          },
          name: {
            type: 'string',
            example: 'Gói hàng trả về',
          },
          sender: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                example: 'Nguyễn Văn A',
              },
              phone: {
                type: 'string',
                example: '+84901234567',
              },
            },
          },
          receiver: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                example: 'Trần Thị B',
              },
              phone: {
                type: 'string',
                example: '+84987654321',
              },
            },
          },
          toRoute: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                example: '507f1f77bcf86cd799439011',
              },
              code: {
                type: 'string',
                example: 'T1',
              },
              name: {
                type: 'string',
                example: 'Tuyến Hà Nội',
              },
            },
          },
          cost: {
            type: 'number',
            example: 50000,
          },
          homeDelivery: {
            type: 'string',
            example: 'Giao tận nhà',
          },
          homeDeliveryCost: {
            type: 'number',
            example: 10000,
          },
          collectForCustomer: {
            type: 'number',
            example: 100000,
          },
          collectForCustomerCost: {
            type: 'number',
            example: 5000,
          },
          itemValue: {
            type: 'number',
            example: 200000,
          },
          itemCost: {
            type: 'number',
            example: 5000,
          },
          totalCost: {
            type: 'number',
            example: 65000,
          },
          actualRevenue: {
            type: 'number',
            example: 60000,
          },
          paymentType: {
            type: 'string',
            enum: ['CASH', 'BANK_TRANSFER', 'CREDIT_CARD'],
            example: 'CASH',
          },
          notes: {
            type: 'string',
            example: 'Ghi chú đặc biệt',
          },
          isReturn: {
            type: 'boolean',
            example: true,
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z',
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T00:00:00.000Z',
          },
          upItems: {
            type: 'string',
            example: 'Hàng lên',
          },
          downItems: {
            type: 'string',
            example: 'Hàng xuống',
          },
          inventory: {
            type: 'string',
            example: 'Kho hàng',
          },
          smsType: {
            type: 'string',
            example: 'SMS_TYPE_1',
          },
          timeToSendSMS: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T10:00:00.000Z',
          },
          quantityReturn: {
            type: 'number',
            example: 1,
          },
          dateReturn: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T15:00:00.000Z',
          },
        },
      },
    },
  },
};

const options = {
  definition: swaggerDefinition,
  apis: ['src/controllers/*.ts', 'src/routes/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
