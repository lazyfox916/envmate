import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate } from '../middleware/auth';
import { requireTeamMember, requireTeamEditor } from '../middleware/team';
import { requireProjectAccess, requireProjectEditor, requireProjectAdmin } from '../middleware/project';
import { validateBody, validateQuery, validateParams } from '../middleware/auth';
import { uploadEnv } from '../middleware/upload';
import { ProjectService } from '../services/ProjectService';
import { EnvService } from '../services/EnvService';
import {
  createProjectSchema,
  updateProjectSchema,
  listProjectsSchema,
  uploadEnvSchema,
  updateEnvVariablesSchema,
  updateSingleVariableSchema,
  deleteVariableParamsSchema,
  projectIdParamsSchema,
  teamProjectParamsSchema,
} from '../validators/project';
import { successResponse, errorResponse } from '../utils/response';
import { EnvironmentType } from '../models/EnvFile';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===========================================
// Team-scoped project routes
// ===========================================

/**
 * Create a new project
 * POST /api/v1/teams/:teamId/projects
 */
router.post(
  '/teams/:teamId/projects',
  validateParams(teamProjectParamsSchema),
  requireTeamMember,
  requireTeamEditor,
  validateBody(createProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const userId = req.userId as string;

      const project = await ProjectService.create(teamId as string, userId, req.body);

      res.status(201).json(successResponse(project));
    } catch (error: any) {
      console.error('Create project error:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to create project'));
      }
    }
  }
);

/**
 * List projects for a team
 * GET /api/v1/teams/:teamId/projects
 */
router.get(
  '/teams/:teamId/projects',
  validateParams(teamProjectParamsSchema),
  requireTeamMember,
  validateQuery(listProjectsSchema),
  async (req: Request, res: Response) => {
    try {
      const { teamId } = req.params;
      const result = await ProjectService.listByTeam(teamId as string, req.query as any);

      res.json(successResponse(result));
    } catch (error) {
      console.error('List projects error:', error);
      res.status(500).json(errorResponse('Failed to list projects'));
    }
  }
);

// ===========================================
// Project-specific routes
// ===========================================

/**
 * Get a project by ID
 * GET /api/v1/projects/:projectId
 */
router.get(
  '/projects/:projectId',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = await ProjectService.getById(projectId as string);

      if (!project) {
        res.status(404).json(errorResponse('Project not found'));
        return;
      }

      res.json(successResponse(project));
    } catch (error) {
      console.error('Get project error:', error);
      res.status(500).json(errorResponse('Failed to get project'));
    }
  }
);

/**
 * Update a project
 * PATCH /api/v1/projects/:projectId
 */
router.patch(
  '/projects/:projectId',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  requireProjectEditor,
  validateBody(updateProjectSchema),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const project = await ProjectService.update(projectId as string, req.body);

      if (!project) {
        res.status(404).json(errorResponse('Project not found'));
        return;
      }

      res.json(successResponse(project));
    } catch (error: any) {
      console.error('Update project error:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to update project'));
      }
    }
  }
);

/**
 * Delete a project
 * DELETE /api/v1/projects/:projectId
 */
router.delete(
  '/projects/:projectId',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  requireProjectAdmin,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const deleted = await ProjectService.delete(projectId as string);

      if (!deleted) {
        res.status(404).json(errorResponse('Project not found'));
        return;
      }

      res.json(successResponse({ deleted: true }));
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json(errorResponse('Failed to delete project'));
    }
  }
);

// ===========================================
// Environment variables routes
// ===========================================

/**
 * Upload .env file content
 * POST /api/v1/projects/:projectId/env
 * Accepts either file upload (multipart/form-data) or JSON body
 */
router.post(
  '/projects/:projectId/env',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  requireProjectEditor,
  uploadEnv.single('file'),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.userId as string;

      let content: string = '';
      let uploadedFilePath: string | undefined;

      // Check if file was uploaded
      if (req.file) {
        // File upload via multipart/form-data (disk storage)
        try {
          content = fs.readFileSync(req.file.path, 'utf-8');
          uploadedFilePath = req.file.path;
          console.log(`File uploaded: ${req.file.originalname} -> ${req.file.path}`);
        } catch (readError) {
          console.error('Error reading uploaded file:', readError);
          // Clean up the file if reading failed
          if (req.file.path) {
            fs.unlink(req.file.path, (err) => {
              if (err) console.error('Error deleting file:', err);
            });
          }
          res.status(400).json(errorResponse('Failed to read uploaded file'));
          return;
        }
      } else if (req.body && req.body.content) {
        // Get content from form data (text area)
        content = req.body.content;
      } else {
        res.status(400).json(errorResponse('Either file or content is required'));
        return;
      }

      const overwrite = req.body.overwrite === 'true' || req.body.overwrite === true;

      const result = await EnvService.uploadEnvContent(
        projectId as string,
        userId,
        content,
        overwrite,
        EnvironmentType.DEVELOPMENT
      );

      res.status(201).json(successResponse({
        envFileId: result.envFile.id,
        variablesCount: result.variablesCount,
        parseErrors: result.errors,
        uploadedFilePath,
      }));
    } catch (error: any) {
      console.error('Upload env error:', error);
      // Clean up the file if processing failed
      if ((error as any).file?.path) {
        fs.unlink((error as any).file.path, (err) => {
          if (err) console.error('Error deleting file:', err);
        });
      }
      if (error.message.includes('too large') || error.message.includes('empty') || error.message.includes('No valid')) {
        res.status(400).json(errorResponse(error.message));
      } else {
        res.status(500).json(errorResponse('Failed to upload environment variables'));
      }
    }
  }
);

/**
 * Get environment variables for a project
 * GET /api/v1/projects/:projectId/env
 */
router.get(
  '/projects/:projectId/env',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const envFileName = (req.query.file as string) || '.env';

      const data = await EnvService.getVariables(projectId as string, envFileName);

      if (!data) {
        res.json(successResponse({
          id: null,
          name: envFileName,
          environment: 'development',
          variables: [],
        }));
        return;
      }

      res.json(successResponse(data));
    } catch (error) {
      console.error('Get env error:', error);
      res.status(500).json(errorResponse('Failed to get environment variables'));
    }
  }
);

/**
 * Export environment variables as .env string
 * GET /api/v1/projects/:projectId/env/export
 */
router.get(
  '/projects/:projectId/env/export',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const envFileName = (req.query.file as string) || '.env';

      const content = await EnvService.exportAsEnvString(projectId as string, envFileName);

      if (!content) {
        res.status(404).json(errorResponse('No environment variables found'));
        return;
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="${envFileName}"`);
      res.send(content);
    } catch (error) {
      console.error('Export env error:', error);
      res.status(500).json(errorResponse('Failed to export environment variables'));
    }
  }
);

/**
 * Update environment variables (batch upsert)
 * PATCH /api/v1/projects/:projectId/env
 */
router.patch(
  '/projects/:projectId/env',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  requireProjectEditor,
  validateBody(updateEnvVariablesSchema),
  async (req: Request, res: Response) => {
    try {
      const { projectId } = req.params;
      const userId = req.userId as string;
      const { variables } = req.body;

      const result = await EnvService.upsertVariables(
        projectId as string,
        userId,
        variables
      );

      res.json(successResponse(result));
    } catch (error) {
      console.error('Update env error:', error);
      res.status(500).json(errorResponse('Failed to update environment variables'));
    }
  }
);

/**
 * Update a single variable
 * PATCH /api/v1/projects/:projectId/env/:key
 */
router.patch(
  '/projects/:projectId/env/:key',
  requireProjectAccess,
  requireProjectEditor,
  validateBody(updateSingleVariableSchema),
  async (req: Request, res: Response) => {
    try {
      const { projectId, key } = req.params;
      const userId = req.userId as string;
      const { value, comment } = req.body;

      const variable = await EnvService.updateVariable(
        projectId as string,
        userId,
        key as string,
        value,
        comment
      );

      if (!variable) {
        res.status(404).json(errorResponse('Variable not found'));
        return;
      }

      res.json(successResponse(variable));
    } catch (error) {
      console.error('Update variable error:', error);
      res.status(500).json(errorResponse('Failed to update variable'));
    }
  }
);

/**
 * Delete a variable
 * DELETE /api/v1/projects/:projectId/env/:key
 */
router.delete(
  '/projects/:projectId/env/:key',
  requireProjectAccess,
  requireProjectEditor,
  async (req: Request, res: Response) => {
    try {
      const { projectId, key } = req.params;
      const userId = req.userId as string;

      const deleted = await EnvService.deleteVariable(
        projectId as string,
        userId,
        key as string
      );

      if (!deleted) {
        res.status(404).json(errorResponse('Variable not found'));
        return;
      }

      res.json(successResponse({ deleted: true }));
    } catch (error) {
      console.error('Delete variable error:', error);
      res.status(500).json(errorResponse('Failed to delete variable'));
    }
  }
);

/**
 * Get a decrypted variable value
 * GET /api/v1/projects/:projectId/variables/:key/decrypt
 */
router.get(
  '/projects/:projectId/variables/:key/decrypt',
  validateParams(projectIdParamsSchema),
  requireProjectAccess,
  async (req: Request, res: Response) => {
    try {
      const { projectId, key } = req.params;
      const envFileName = (req.query.file as string) || '.env';

      const variable = await EnvService.getVariable(
        projectId as string,
        key as string,
        envFileName
      );

      if (!variable) {
        res.status(404).json(errorResponse('Variable not found'));
        return;
      }

      res.json(successResponse({
        decryptedValue: variable.value,
      }));
    } catch (error) {
      console.error('Get decrypted variable error:', error);
      res.status(500).json(errorResponse('Failed to decrypt variable'));
    }
  }
);

/**
 * DEBUG: List uploaded files
 * GET /api/v1/debug/uploads
 */
router.get(
  '/debug/uploads',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const uploadsDir = path.resolve(__dirname, '../../uploads');
      console.log(`Checking uploads directory: ${uploadsDir}`);
      
      if (!fs.existsSync(uploadsDir)) {
        res.json(successResponse({
          uploadsDir,
          exists: false,
          files: [],
          message: 'Uploads directory does not exist',
        }));
        return;
      }

      const files = fs.readdirSync(uploadsDir);
      const filesInfo = files.map((file) => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
        };
      });

      res.json(successResponse({
        uploadsDir,
        exists: true,
        fileCount: files.length,
        files: filesInfo,
      }));
    } catch (error) {
      console.error('Debug uploads error:', error);
      res.status(500).json(errorResponse('Failed to list uploads'));
    }
  }
);

export default router;
