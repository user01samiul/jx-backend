import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";
import { swaggerAuthMiddleware } from "./middlewares/swaggerAuth.middleware";

const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "API documentation for JackpotX backend",
    version: "1.0.0",
    description: "Comprehensive API documentation for JackpotX casino platform.\n\nPowered by Oniacor Tech SRL",
  },
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [
    {
      BearerAuth: [],
    },
  ],
};

export const options: any = {
  swaggerDefinition,
  apis: ["./src/routes/**/*.ts", "./src/api/**/*.ts", "./src/routes/provider-callback-swagger.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

export const setupSwagger = (app: Application) => {
  console.log("Loaded Swagger paths:", Object.keys(swaggerSpec.paths));

  // Protected API docs JSON endpoint
  app.get("/api-docs.json", swaggerAuthMiddleware, (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Enhanced comprehensive search endpoint for tags, endpoints, and all content
  app.get("/api-search", swaggerAuthMiddleware, (req, res) => {
    const { query, type } = req.query;
    
    if (!query || typeof query !== 'string') {
      res.status(400).json({
        success: false,
        message: "Query parameter is required and must be a string"
      });
    }

    const searchQuery = (query as string).toLowerCase();
    const searchResults: any = {
      tags: [],
      endpoints: [],
      schemas: [],
      total: 0
    };

    // Helper function to search in nested objects and arrays
    const searchInObject = (obj: any, searchTerm: string): boolean => {
      if (typeof obj === 'string') {
        return obj.toLowerCase().includes(searchTerm);
      }
      if (Array.isArray(obj)) {
        return obj.some(item => searchInObject(item, searchTerm));
      }
      if (typeof obj === 'object' && obj !== null) {
        return Object.values(obj).some(value => searchInObject(value, searchTerm));
      }
      return false;
    };

    // Search through tags
    if (!type || type === 'tags') {
      const tags = swaggerSpec.tags || [];
      tags.forEach((tag: any) => {
        if (searchInObject(tag, searchQuery)) {
          searchResults.tags.push({
            name: tag.name,
            description: tag.description || '',
            type: 'tag',
            matchedFields: []
          });
        }
      });
    }

    // Search through endpoints with comprehensive keyword matching
    if (!type || type === 'endpoints') {
      const paths = swaggerSpec.paths || {};
      Object.keys(paths).forEach(path => {
        const pathItem = paths[path];
        Object.keys(pathItem).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
            const operation = pathItem[method];
            
            // Comprehensive search across all operation properties
            const matchedFields: string[] = [];
            
            // Basic matches
            if (path.toLowerCase().includes(searchQuery)) matchedFields.push('path');
            if (operation.summary && operation.summary.toLowerCase().includes(searchQuery)) matchedFields.push('summary');
            if (operation.description && operation.description.toLowerCase().includes(searchQuery)) matchedFields.push('description');
            if (operation.operationId && operation.operationId.toLowerCase().includes(searchQuery)) matchedFields.push('operationId');
            
            // Tag matches
            if (operation.tags && operation.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery))) {
              matchedFields.push('tags');
            }

            // Parameter matches (query, path, body, header parameters)
            if (operation.parameters && Array.isArray(operation.parameters)) {
              operation.parameters.forEach((param: any, index: number) => {
                if (searchInObject(param, searchQuery)) {
                  matchedFields.push(`parameter[${index}]`);
                }
              });
            }

            // Request body matches
            if (operation.requestBody && searchInObject(operation.requestBody, searchQuery)) {
              matchedFields.push('requestBody');
            }

            // Response matches
            if (operation.responses && searchInObject(operation.responses, searchQuery)) {
              matchedFields.push('responses');
            }

            // Security matches
            if (operation.security && searchInObject(operation.security, searchQuery)) {
              matchedFields.push('security');
            }

            // Any match found
            if (matchedFields.length > 0) {
              searchResults.endpoints.push({
                path,
                method: method.toUpperCase(),
                summary: operation.summary || '',
                description: operation.description || '',
                tags: operation.tags || [],
                operationId: operation.operationId || '',
                parameters: operation.parameters || [],
                matchedFields,
                type: 'endpoint'
              });
            }
          }
        });
      });
    }

    // Search through schemas/components
    if (!type || type === 'schemas') {
      const components = swaggerSpec.components || {};
      if (components.schemas) {
        Object.keys(components.schemas).forEach(schemaName => {
          const schema = components.schemas[schemaName];
          if (schemaName.toLowerCase().includes(searchQuery) || searchInObject(schema, searchQuery)) {
            searchResults.schemas.push({
              name: schemaName,
              schema: schema,
              type: 'schema'
            });
          }
        });
      }
    }

    searchResults.total = searchResults.tags.length + searchResults.endpoints.length + searchResults.schemas.length;

    res.json({
      success: true,
      query: query,
      searchType: type || 'all',
      results: searchResults,
      tips: [
        "Search works across paths, summaries, descriptions, tags, parameters, request/response bodies",
        "Use 'type=tags' to search only tags, 'type=endpoints' for endpoints only, 'type=schemas' for schemas only",
        "Leave type empty to search everything"
      ]
    });
  });

  // Protected Swagger UI with enhanced search functionality
  app.use("/docs", swaggerAuthMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    explorer: true,
    swaggerOptions: {
      persistAuthorization: true,
      filter: true, // Enable filtering/search box
      tryItOutEnabled: true,
      requestInterceptor: (request: any) => {
        // Add any request modifications if needed
        return request;
      },
      onComplete: () => {
        // Enhance the built-in search to work with more content
        setTimeout(() => {
          const filterInput = document.querySelector('.operation-filter-input') as HTMLInputElement;
          if (filterInput) {
            filterInput.placeholder = 'Search endpoints, tags, summaries, descriptions, parameters...';
            filterInput.setAttribute('title', 'Search across all API documentation content');
          }
        }, 1000);
      },
      urls: [
        {
          url: "https://backend.jackpotx.net/api-docs.json",
          name: "Production (HTTPS)",
        },
        {
          url: "http://185.209.229.198:3000/api-docs.json",
          name: "Local (HTTP)",
        },
      ],
      urlsPrimaryName: "Production (HTTPS)",
      docExpansion: "none", // Collapse all sections on load
      validatorUrl: null,
      deepLinking: true, // Enable deep linking for better navigation
      displayOperationId: true, // Show operation IDs for easier searching
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      showExtensions: true,
      showCommonExtensions: true,
    },
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { 
        background: #f7f7f7; 
        border: 1px solid #d3d3d3; 
        border-radius: 4px; 
        padding: 10px;
        margin: 10px 0;
      }
      .swagger-ui .filter .operation-filter-input {
        width: 100% !important;
        max-width: 300px;
        padding: 8px 12px;
        font-size: 14px;
        border: 2px solid #3b82f6;
        border-radius: 6px;
        margin-bottom: 20px;
      }
      .swagger-ui .info .title {
        color: #1f2937;
        font-size: 36px;
        margin-bottom: 10px;
      }
      .swagger-ui .opblock-tag {
        font-size: 18px;
        font-weight: bold;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
        padding-bottom: 10px;
        margin-bottom: 15px;
      }
      .swagger-ui .opblock {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        margin-bottom: 10px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }
      .swagger-ui .opblock.opblock-get .opblock-summary {
        border-color: #10b981;
        background-color: #f0fdf4;
      }
      .swagger-ui .opblock.opblock-post .opblock-summary {
        border-color: #3b82f6;
        background-color: #eff6ff;
      }
      .swagger-ui .opblock.opblock-put .opblock-summary {
        border-color: #f59e0b;
        background-color: #fffbeb;
      }
      .swagger-ui .opblock.opblock-delete .opblock-summary {
        border-color: #ef4444;
        background-color: #fef2f2;
      }
    `,
  }));

  app.get("/", (_req, res) => {
    res.redirect("/docs");
  });
};

export { swaggerSpec };