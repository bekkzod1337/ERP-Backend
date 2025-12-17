import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Learning Management API",
      version: "1.0.0",
      description: "API documentation for LMS",
    },
    servers: [
      {
        url: "http://localhost:4000",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },

  // 👇 YOUR REAL PATHS (MUST BE THESE!)
  apis: [
    "./src/controller/**/*.js",
    "./src/routes/**/*.js"
  ],
};

export const swaggerSpec = swaggerJsDoc(options);

export function setupSwagger(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}
