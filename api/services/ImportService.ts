import { randomUUID } from 'crypto';
import { query } from '../config/database';
import {
  ImportErrorItem,
  ImportJob,
  ImportJobStatus,
  ImportOptions,
  ImportRecord,
} from '../types';
import { ImportError } from '../utils/errors';
import { personService } from './PersonService';
import { relationshipService } from './RelationshipService';

interface ImportTask {
  job_id: string;
  status: ImportJobStatus;
  records: ImportRecord[];
  options: ImportOptions;
  current_index: number;
  created_by: string;
  family_id: string;
  created_at: Date;
  updated_at: Date;
  results: {
    succeeded: string[];
    failed: ImportErrorItem[];
    persons: Map<string, string>;
  };
}

const importTasks = new Map<string, ImportTask>();

export class ImportService {
  async createImportJob(
    file_buffer: Buffer,
    file_type: 'csv' | 'xlsx',
    options: ImportOptions,
    family_id: string,
    created_by: string
  ): Promise<ImportJob> {
    await this.ensureFamilyExists(family_id);

    const records = this.parseFile(file_buffer, file_type);
    const job_id = randomUUID();
    const task: ImportTask = {
      job_id,
      status: 'pending',
      records,
      options,
      current_index: 0,
      created_by,
      family_id,
      created_at: new Date(),
      updated_at: new Date(),
      results: {
        succeeded: [],
        failed: [],
        persons: new Map(),
      },
    };

    importTasks.set(job_id, task);

    if (options.transaction_mode !== 'dry_run') {
      setImmediate(() => {
        void this.processImportJob(job_id);
      });
    }

    return this.buildImportJob(task);
  }

  async getImportJob(job_id: string): Promise<ImportJob | null> {
    const task = importTasks.get(job_id);
    return task ? this.buildImportJob(task) : null;
  }

  async cancelImportJob(job_id: string): Promise<boolean> {
    const task = importTasks.get(job_id);
    if (!task || task.status === 'completed' || task.status === 'failed') {
      return false;
    }

    task.status = 'failed';
    task.updated_at = new Date();
    return true;
  }

  private async processImportJob(job_id: string): Promise<void> {
    const task = importTasks.get(job_id);
    if (!task) {
      return;
    }

    task.status = 'processing';
    task.updated_at = new Date();

    try {
      for (let index = 0; index < task.records.length; index += 1) {
        if (importTasks.get(job_id)?.status === 'failed') {
          return;
        }

        const record = task.records[index];
        task.current_index = index + 1;
        task.updated_at = new Date();

        try {
          const person_id = await this.upsertPerson(record, task.family_id, task.created_by, task.options);
          task.results.succeeded.push(person_id);

          if (record.id) {
            task.results.persons.set(record.id, person_id);
          }
        } catch (error) {
          task.results.failed.push({
            row: index + 1,
            field: 'general',
            message: error instanceof Error ? error.message : '导入失败',
          });

          if (task.options.transaction_mode === 'all_or_nothing') {
            throw error;
          }
        }
      }

      await this.createRelationships(task);
      task.status = 'completed';
      task.updated_at = new Date();
    } catch (error) {
      task.status = 'failed';
      task.updated_at = new Date();

      if (task.results.failed.length === 0) {
        task.results.failed.push({
          row: task.current_index || 0,
          field: 'general',
          message: error instanceof Error ? error.message : '导入失败',
        });
      }
    }
  }

  private async upsertPerson(
    record: ImportRecord,
    family_id: string,
    created_by: string,
    options: ImportOptions
  ): Promise<string> {
    if (!record.name?.trim()) {
      throw new ImportError('姓名不能为空');
    }

    if (options.skip_duplicates) {
      const existing = await query<{ id: string }>(
        `
          SELECT id
          FROM persons
          WHERE family_id = $1
            AND name = $2
          LIMIT 1
        `,
        [family_id, record.name.trim()]
      );

      if (existing.rows[0]) {
        return existing.rows[0].id;
      }
    }

    const person = await personService.createPerson(
      {
        family_id,
        name: record.name.trim(),
        gender: this.normalizeGender(record.gender),
        birth_date: record.birth_date || undefined,
        death_date: record.death_date || undefined,
        bio: record.bio || undefined,
      },
      created_by
    );

    return person.id;
  }

  private async createRelationships(task: ImportTask): Promise<void> {
    const spousePairs = new Set<string>();

    for (const record of task.records) {
      const person_id = record.id ? task.results.persons.get(record.id) : undefined;
      if (!person_id) {
        continue;
      }

      const parentLinks: Array<{ parent_ref?: string; subtype: 'father' | 'mother' }> = [
        { parent_ref: record.father_id, subtype: 'father' },
        { parent_ref: record.mother_id, subtype: 'mother' },
      ];

      for (const link of parentLinks) {
        if (!link.parent_ref) {
          continue;
        }

        const parent_id = task.results.persons.get(link.parent_ref);
        if (!parent_id) {
          continue;
        }

        await relationshipService.createRelationship(
          {
            from_person_id: parent_id,
            to_person_id: person_id,
            type: 'parent_child',
            subtype: link.subtype,
          },
          task.created_by
        );
      }

      if (record.spouse_id) {
        const spouse_id = task.results.persons.get(record.spouse_id);
        if (!spouse_id) {
          continue;
        }

        const key = [person_id, spouse_id].sort().join(':');
        if (spousePairs.has(key)) {
          continue;
        }

        spousePairs.add(key);
        await relationshipService.createRelationship(
          {
            from_person_id: person_id,
            to_person_id: spouse_id,
            type: 'spouse',
          },
          task.created_by
        );
      }
    }
  }

  private parseFile(file_buffer: Buffer, file_type: 'csv' | 'xlsx'): ImportRecord[] {
    if (file_type === 'xlsx') {
      throw new ImportError('V1 当前仅支持 CSV 导入，请先转换为 CSV 文件');
    }

    const rows = file_buffer.toString('utf-8').replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
    if (rows.length < 2) {
      throw new ImportError('导入文件不能为空');
    }

    const headers = this.parseCsvLine(rows[0]);
    return rows.slice(1).map((row) => {
      const values = this.parseCsvLine(row);
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        record[header] = values[index] ?? '';
      });
      return record as unknown as ImportRecord;
    });
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"') {
        if (inQuotes && next === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    result.push(current.trim());
    return result;
  }

  private normalizeGender(value?: string): 'male' | 'female' | 'unknown' {
    const normalized = (value || '').trim().toLowerCase();
    if (normalized === 'male' || normalized === 'm') {
      return 'male';
    }
    if (normalized === 'female' || normalized === 'f') {
      return 'female';
    }
    return 'unknown';
  }

  private buildImportJob(task: ImportTask): ImportJob {
    return {
      id: task.job_id,
      status: task.status,
      summary: {
        total: task.records.length,
        processed: task.current_index,
        succeeded: task.results.succeeded.length,
        failed: task.results.failed.length,
      },
      errors: task.results.failed,
      checkpoint:
        task.results.persons.size > 0
          ? Buffer.from(
              JSON.stringify({
                current_index: task.current_index,
                persons: Array.from(task.results.persons.entries()),
              })
            ).toString('base64')
          : null,
      created_at: task.created_at,
      updated_at: task.updated_at,
    };
  }

  private async ensureFamilyExists(family_id: string): Promise<void> {
    const result = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM families WHERE id = $1) AS exists',
      [family_id]
    );

    if (!result.rows[0]?.exists) {
      throw new ImportError('目标家族不存在');
    }
  }
}

export const importService = new ImportService();
