import { Op, Transaction } from 'sequelize';
import { Project, Team, EnvFile, EnvVariable, User } from '../models';
import sequelize from '../database/connection';
import { CreateProjectInput, UpdateProjectInput, ListProjectsInput } from '../validators/project';

/**
 * Service for managing projects
 */
export class ProjectService {
  /**
   * Create a new project within a team
   */
  static async create(
    teamId: string,
    userId: string,
    data: CreateProjectInput
  ): Promise<Project> {
    // Check for existing project with same name in team
    const existing = await Project.findOne({
      where: {
        team_id: teamId,
        name: data.name,
      },
    });

    if (existing) {
      throw new Error('A project with this name already exists in the team');
    }

    const project = await Project.create({
      team_id: teamId,
      name: data.name,
      description: data.description || null,
      created_by: userId,
    });

    return project;
  }

  /**
   * Get a project by ID
   */
  static async getById(projectId: string): Promise<Project | null> {
    return Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'name'],
        },
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name'],
        },
        {
          model: EnvFile,
          as: 'envFiles',
          attributes: ['id', 'name', 'environment', 'created_at', 'updated_at'],
        },
      ],
    });
  }

  /**
   * Get a project by ID with team info (for checking access)
   */
  static async getByIdWithTeam(projectId: string): Promise<Project | null> {
    return Project.findByPk(projectId, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'owner_id'],
        },
      ],
    });
  }

  /**
   * List projects for a team
   */
  static async listByTeam(
    teamId: string,
    options: ListProjectsInput
  ): Promise<{ projects: Project[]; total: number; page: number; limit: number }> {
    const { search, page, limit } = options;
    const offset = (page - 1) * limit;

    const whereClause: any = {
      team_id: teamId,
    };

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await Project.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'email', 'name'],
        },
        {
          model: EnvFile,
          as: 'envFiles',
          attributes: ['id', 'name', 'environment'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      projects: rows,
      total: count,
      page,
      limit,
    };
  }

  /**
   * Update a project
   */
  static async update(
    projectId: string,
    data: UpdateProjectInput
  ): Promise<Project | null> {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return null;
    }

    // If name is being updated, check for duplicates
    if (data.name && data.name !== project.name) {
      const existing = await Project.findOne({
        where: {
          team_id: project.team_id,
          name: data.name,
          id: { [Op.ne]: projectId },
        },
      });

      if (existing) {
        throw new Error('A project with this name already exists in the team');
      }
    }

    await project.update({
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    });

    return project;
  }

  /**
   * Delete a project (soft delete)
   */
  static async delete(projectId: string): Promise<boolean> {
    const project = await Project.findByPk(projectId);
    
    if (!project) {
      return false;
    }

    // Soft delete the project (cascades to env files via paranoid)
    await project.destroy();
    return true;
  }

  /**
   * Hard delete a project and all associated data
   */
  static async hardDelete(projectId: string, transaction?: Transaction): Promise<boolean> {
    const t = transaction || await sequelize.transaction();
    
    try {
      // Delete env variables first
      const envFiles = await EnvFile.findAll({
        where: { project_id: projectId },
        paranoid: false,
      });

      for (const envFile of envFiles) {
        await EnvVariable.destroy({
          where: { env_file_id: envFile.id },
          force: true,
          transaction: t,
        });
      }

      // Delete env files
      await EnvFile.destroy({
        where: { project_id: projectId },
        force: true,
        transaction: t,
      });

      // Delete project
      await Project.destroy({
        where: { id: projectId },
        force: true,
        transaction: t,
      });

      if (!transaction) {
        await t.commit();
      }

      return true;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Get project count for a team
   */
  static async countByTeam(teamId: string): Promise<number> {
    return Project.count({
      where: { team_id: teamId },
    });
  }

  /**
   * Check if a user can access a project (through team membership)
   */
  static async canUserAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: Team,
          as: 'team',
          required: true,
        },
      ],
    });

    if (!project) {
      return false;
    }

    // Check team membership (assuming TeamService or direct query)
    const { TeamMember } = await import('../models');
    const membership = await TeamMember.findOne({
      where: {
        team_id: project.team_id,
        user_id: userId,
      },
    });

    return !!membership;
  }

  /**
   * Get all projects created by a user
   */
  static async listByCreator(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ projects: Project[]; total: number }> {
    const offset = (page - 1) * limit;

    const { count, rows } = await Project.findAndCountAll({
      where: { created_by: userId },
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return {
      projects: rows,
      total: count,
    };
  }
}

export default ProjectService;
