/**
 * OpenAPI/Swagger 配置
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: '双系族谱系统 API',
    version: '1.0.0',
    description: '支持双系（父系/母系）族谱管理的RESTful API',
    contact: {
      name: '技术支持',
      email: 'support@example.com',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000/api/v1',
      description: '本地开发服务器',
    },
  ],
  tags: [
    {
      name: '人员管理',
      description: '人员的增删改查操作',
    },
    {
      name: '关系管理',
      description: '亲属关系的增删改查操作',
    },
    {
      name: '家族管理',
      description: '家族的增删改查和家族树获取',
    },
    {
      name: '称谓计算',
      description: '计算两个人之间的称谓关系',
    },
    {
      name: '系别判定',
      description: '判定亲属的系别（父系/母系/姻亲）',
    },
    {
      name: '搜索',
      description: '全文搜索和高级搜索',
    },
    {
      name: '批量导入',
      description: '批量导入人员和关系数据',
    },
  ],
  components: {
    schemas: {
      Person: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          family_id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
          },
          gender: {
            type: 'string',
            enum: ['male', 'female', 'unknown'],
          },
          birth_date: {
            type: 'string',
            format: 'date',
          },
          death_date: {
            type: 'string',
            format: 'date',
          },
          bio: {
            type: 'string',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'family_id', 'name', 'gender', 'created_at', 'updated_at'],
      },
      Relationship: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          from_person_id: {
            type: 'string',
            format: 'uuid',
          },
          to_person_id: {
            type: 'string',
            format: 'uuid',
          },
          type: {
            type: 'string',
            enum: ['parent_child', 'spouse', 'sibling'],
          },
          subtype: {
            type: 'string',
          },
          start_date: {
            type: 'string',
            format: 'date',
          },
          end_date: {
            type: 'string',
            format: 'date',
          },
          is_active: {
            type: 'boolean',
          },
          metadata: {
            type: 'object',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'from_person_id', 'to_person_id', 'type', 'is_active'],
      },
      Family: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          name: {
            type: 'string',
          },
          description: {
            type: 'string',
          },
          root_person_id: {
            type: 'string',
            format: 'uuid',
          },
          created_at: {
            type: 'string',
            format: 'date-time',
          },
          updated_at: {
            type: 'string',
            format: 'date-time',
          },
        },
        required: ['id', 'name', 'created_at', 'updated_at'],
      },
      TitleResult: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
          },
          temporal_context: {
            type: 'object',
            properties: {
              as_of: {
                type: 'string',
                format: 'date',
              },
              relationship_status: {
                type: 'string',
                enum: ['active', 'inactive', 'changed'],
              },
              note: {
                type: 'string',
              },
            },
          },
          details: {
            type: 'object',
            properties: {
              from_side: {
                type: 'string',
                enum: ['paternal', 'maternal', 'affinity', 'self'],
              },
              to_side: {
                type: 'string',
                enum: ['paternal', 'maternal', 'affinity', 'self'],
              },
              generation_gap: {
                type: 'integer',
              },
              rank: {
                type: 'integer',
              },
            },
          },
        },
        required: ['title', 'temporal_context'],
      },
      ImportJob: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed'],
          },
          summary: {
            type: 'object',
            properties: {
              total: {
                type: 'integer',
              },
              processed: {
                type: 'integer',
              },
              succeeded: {
                type: 'integer',
              },
              failed: {
                type: 'integer',
              },
            },
          },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                row: {
                  type: 'integer',
                },
                field: {
                  type: 'string',
                },
                message: {
                  type: 'string',
                },
              },
            },
          },
          checkpoint: {
            type: 'string',
          },
        },
        required: ['id', 'status', 'summary'],
      },
      ApiError: {
        type: 'object',
        properties: {
          code: {
            type: 'string',
          },
          message: {
            type: 'string',
          },
          details: {
            type: 'object',
          },
        },
        required: ['code', 'message'],
      },
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
