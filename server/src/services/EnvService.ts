import { Op, Transaction } from 'sequelize';
import { EnvFile, EnvVariable, Project, EnvironmentType } from '../models';
import sequelize from '../database/connection';
import { EncryptionService } from './EncryptionService';
import { parseEnvContent, validateEnvFile, EnvVariable as ParsedEnvVariable } from '../utils/envParser';

export interface DecryptedVariable {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isSecret: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EnvFileWithVariables {
  id: string;
  name: string;
  environment: string;
  description: string | null;
  variables: DecryptedVariable[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for managing environment files and variables
 */
export class EnvService {
  /**
   * Get or create the default env file for a project
   */
  static async getOrCreateEnvFile(
    projectId: string,
    userId: string,
    environment: EnvironmentType = EnvironmentType.DEVELOPMENT,
    name: string = '.env'
  ): Promise<EnvFile> {
    let envFile = await EnvFile.findOne({
      where: {
        project_id: projectId,
        name,
      },
    });

    if (!envFile) {
      envFile = await EnvFile.create({
        project_id: projectId,
        name,
        environment,
        created_by: userId,
        last_modified_by: userId,
      });
    }

    return envFile;
  }

  /**
   * Get env file by ID
   */
  static async getEnvFileById(envFileId: string): Promise<EnvFile | null> {
    return EnvFile.findByPk(envFileId, {
      include: [
        {
          model: Project,
          as: 'project',
          attributes: ['id', 'name', 'team_id'],
        },
      ],
    });
  }

  /**
   * Get all env files for a project
   */
  static async listEnvFiles(projectId: string): Promise<EnvFile[]> {
    return EnvFile.findAll({
      where: { project_id: projectId },
      order: [['name', 'ASC']],
    });
  }

  /**
   * Upload/parse .env content and store encrypted variables
   */
  static async uploadEnvContent(
    projectId: string,
    userId: string,
    content: string,
    overwrite: boolean = false,
    environment: EnvironmentType = EnvironmentType.DEVELOPMENT,
    fileName: string = '.env'
  ): Promise<{ envFile: EnvFile; variablesCount: number; errors: string[] }> {
    // Validate file content
    const validation = validateEnvFile(content);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Parse the .env content
    const { variables, errors } = parseEnvContent(content);

    if (variables.length === 0) {
      throw new Error('No valid variables found in the content');
    }

    const transaction = await sequelize.transaction();

    try {
      // Get or create env file
      let envFile = await EnvFile.findOne({
        where: { project_id: projectId, name: fileName },
        transaction,
      });

      if (!envFile) {
        envFile = await EnvFile.create({
          project_id: projectId,
          name: fileName,
          environment,
          created_by: userId,
          last_modified_by: userId,
        }, { transaction });
      } else {
        await envFile.update({ last_modified_by: userId }, { transaction });
      }

      // If overwrite, delete existing variables
      if (overwrite) {
        await EnvVariable.destroy({
          where: { env_file_id: envFile.id },
          transaction,
        });
      }

      // Get existing variable keys
      const existingVars = overwrite ? [] : await EnvVariable.findAll({
        where: { env_file_id: envFile.id },
        attributes: ['key'],
        transaction,
      });
      const existingKeys = new Set(existingVars.map(v => v.key));

      // Insert new variables
      let insertedCount = 0;
      for (const variable of variables) {
        if (!overwrite && existingKeys.has(variable.key)) {
          // Update existing variable
          const encrypted = EncryptionService.encrypt(variable.value);
          await EnvVariable.update(
            {
              encrypted_value: encrypted.encryptedData,
              iv: encrypted.iv,
              auth_tag: encrypted.authTag,
              last_modified_by: userId,
            },
            {
              where: { env_file_id: envFile.id, key: variable.key },
              transaction,
            }
          );
        } else {
          // Create new variable
          const encrypted = EncryptionService.encrypt(variable.value);
          await EnvVariable.create({
            env_file_id: envFile.id,
            key: variable.key,
            encrypted_value: encrypted.encryptedData,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            description: variable.comment || null,
            is_secret: true,
            created_by: userId,
            last_modified_by: userId,
          }, { transaction });
          insertedCount++;
        }
      }

      await transaction.commit();

      return {
        envFile,
        variablesCount: variables.length,
        errors,
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all variables for a project (decrypted)
   */
  static async getVariables(
    projectId: string,
    envFileName: string = '.env'
  ): Promise<EnvFileWithVariables | null> {
    const envFile = await EnvFile.findOne({
      where: { project_id: projectId, name: envFileName },
    });

    if (!envFile) {
      return null;
    }

    const variables = await EnvVariable.findAll({
      where: { env_file_id: envFile.id },
      order: [['key', 'ASC']],
    });

    // Decrypt all variables
    const decryptedVariables: DecryptedVariable[] = variables.map(variable => {
      let decryptedValue: string;
      try {
        decryptedValue = EncryptionService.decrypt({
          encryptedData: variable.encrypted_value,
          iv: variable.iv,
          authTag: variable.auth_tag,
        });
      } catch {
        decryptedValue = '[DECRYPTION_ERROR]';
      }

      return {
        id: variable.id,
        key: variable.key,
        value: decryptedValue,
        description: variable.description,
        isSecret: variable.is_secret,
        createdAt: variable.created_at,
        updatedAt: variable.updated_at,
      };
    });

    return {
      id: envFile.id,
      name: envFile.name,
      environment: envFile.environment,
      description: envFile.description,
      variables: decryptedVariables,
      createdAt: envFile.created_at,
      updatedAt: envFile.updated_at,
    };
  }

  /**
   * Get a single variable (decrypted)
   */
  static async getVariable(
    projectId: string,
    key: string,
    envFileName: string = '.env'
  ): Promise<DecryptedVariable | null> {
    const envFile = await EnvFile.findOne({
      where: { project_id: projectId, name: envFileName },
    });

    if (!envFile) {
      return null;
    }

    const variable = await EnvVariable.findOne({
      where: { env_file_id: envFile.id, key },
    });

    if (!variable) {
      return null;
    }

    const decryptedValue = EncryptionService.decrypt({
      encryptedData: variable.encrypted_value,
      iv: variable.iv,
      authTag: variable.auth_tag,
    });

    return {
      id: variable.id,
      key: variable.key,
      value: decryptedValue,
      description: variable.description,
      isSecret: variable.is_secret,
      createdAt: variable.created_at,
      updatedAt: variable.updated_at,
    };
  }

  /**
   * Update or create variables
   */
  static async upsertVariables(
    projectId: string,
    userId: string,
    variables: Array<{ key: string; value: string; comment?: string }>,
    envFileName: string = '.env'
  ): Promise<{ created: number; updated: number }> {
    const transaction = await sequelize.transaction();

    try {
      const envFile = await this.getOrCreateEnvFile(projectId, userId);

      let created = 0;
      let updated = 0;

      for (const variable of variables) {
        const encrypted = EncryptionService.encrypt(variable.value);

        const existing = await EnvVariable.findOne({
          where: { env_file_id: envFile.id, key: variable.key },
          transaction,
        });

        if (existing) {
          await existing.update({
            encrypted_value: encrypted.encryptedData,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            description: variable.comment || existing.description,
            last_modified_by: userId,
          }, { transaction });
          updated++;
        } else {
          await EnvVariable.create({
            env_file_id: envFile.id,
            key: variable.key,
            encrypted_value: encrypted.encryptedData,
            iv: encrypted.iv,
            auth_tag: encrypted.authTag,
            description: variable.comment || null,
            is_secret: true,
            created_by: userId,
            last_modified_by: userId,
          }, { transaction });
          created++;
        }
      }

      await envFile.update({ last_modified_by: userId }, { transaction });
      await transaction.commit();

      return { created, updated };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update a single variable
   */
  static async updateVariable(
    projectId: string,
    userId: string,
    key: string,
    value: string,
    comment?: string,
    envFileName: string = '.env'
  ): Promise<DecryptedVariable | null> {
    const envFile = await EnvFile.findOne({
      where: { project_id: projectId, name: envFileName },
    });

    if (!envFile) {
      return null;
    }

    const variable = await EnvVariable.findOne({
      where: { env_file_id: envFile.id, key },
    });

    if (!variable) {
      return null;
    }

    const encrypted = EncryptionService.encrypt(value);

    await variable.update({
      encrypted_value: encrypted.encryptedData,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      ...(comment !== undefined && { description: comment }),
      last_modified_by: userId,
    });

    await envFile.update({ last_modified_by: userId });

    return {
      id: variable.id,
      key: variable.key,
      value,
      description: variable.description,
      isSecret: variable.is_secret,
      createdAt: variable.created_at,
      updatedAt: variable.updated_at,
    };
  }

  /**
   * Delete a variable
   */
  static async deleteVariable(
    projectId: string,
    userId: string,
    key: string,
    envFileName: string = '.env'
  ): Promise<boolean> {
    const envFile = await EnvFile.findOne({
      where: { project_id: projectId, name: envFileName },
    });

    if (!envFile) {
      return false;
    }

    const deleted = await EnvVariable.destroy({
      where: { env_file_id: envFile.id, key },
    });

    if (deleted > 0) {
      await envFile.update({ last_modified_by: userId });
    }

    return deleted > 0;
  }

  /**
   * Delete an entire env file and its variables
   */
  static async deleteEnvFile(
    envFileId: string,
    transaction?: Transaction
  ): Promise<boolean> {
    const t = transaction || await sequelize.transaction();

    try {
      // Delete all variables first
      await EnvVariable.destroy({
        where: { env_file_id: envFileId },
        transaction: t,
      });

      // Delete the env file
      const deleted = await EnvFile.destroy({
        where: { id: envFileId },
        transaction: t,
      });

      if (!transaction) {
        await t.commit();
      }

      return deleted > 0;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      throw error;
    }
  }

  /**
   * Export variables as .env format string
   */
  static async exportAsEnvString(
    projectId: string,
    envFileName: string = '.env'
  ): Promise<string | null> {
    const data = await this.getVariables(projectId, envFileName);
    
    if (!data) {
      return null;
    }

    const lines: string[] = [];
    
    for (const variable of data.variables) {
      if (variable.description) {
        lines.push(`# ${variable.description}`);
      }
      
      // Quote values that need it
      const needsQuotes = 
        variable.value.includes('\n') ||
        variable.value.includes(' ') ||
        variable.value.includes('#') ||
        variable.value.includes('"') ||
        variable.value.includes("'");

      if (needsQuotes) {
        const escaped = variable.value
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n');
        lines.push(`${variable.key}="${escaped}"`);
      } else {
        lines.push(`${variable.key}=${variable.value}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Count variables in a project
   */
  static async countVariables(
    projectId: string,
    envFileName: string = '.env'
  ): Promise<number> {
    const envFile = await EnvFile.findOne({
      where: { project_id: projectId, name: envFileName },
    });

    if (!envFile) {
      return 0;
    }

    return EnvVariable.count({
      where: { env_file_id: envFile.id },
    });
  }
}

export default EnvService;
