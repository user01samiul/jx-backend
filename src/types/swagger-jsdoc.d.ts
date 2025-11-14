declare module 'swagger-jsdoc' {
    import { OpenAPIV3 } from 'openapi-types';
  
    interface Options {
      swaggerDefinition: OpenAPIV3.Document;
      apis: string[];
    }
  
    export default function swaggerJSDoc(options: Options): OpenAPIV3.Document;
  }