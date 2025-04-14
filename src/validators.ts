import { z } from 'zod';
import {
  JQLSearchArgs,
  GetIssueArgs,
  CreateIssueArgs,
  UpdateIssueArgs,
  GetSprintReportArgs
} from './types.js';

// Helper functions for type conversion
function toNumber(val: unknown): number | undefined {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        const num = Number(val);
        return !isNaN(num) ? num : undefined;
    }
    return undefined;
}

function toBoolean(val: unknown): boolean | undefined {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') {
        const lowered = val.toLowerCase();
        if (lowered === 'true' || lowered === '1') return true;
        if (lowered === 'false' || lowered === '0') return false;
    }
    if (typeof val === 'number') {
        return val !== 0;
    }
    return undefined;
}

// Helper function to convert any value to string array
function toStringArray(val: unknown): string[] {
    if (Array.isArray(val)) {
        return val
            .map(item => String(item))
            .filter(item => item !== 'undefined' && item !== 'null');
    }
    return [];
}

// Define Zod schemas with type coercion
const JQLSearchSchema = z.object({
    jql: z.string().min(1, "JQL query cannot be empty"),
    nextPageToken: z.string().optional(),
    maxResults: z.union([z.string(), z.number()]).optional()
        .transform(val => {
            if (val === undefined) return undefined;
            return typeof val === 'number' ? val : parseInt(val) || undefined;
        }),
    fields: z.union([z.string(), z.array(z.string())]).optional()
        .transform(val => {
            if (!val) return undefined;
            if (typeof val === 'string') return val.split(',');
            return val;
        }),
    expand: z.string().optional()
});

const GetIssueSchema = z.object({
    issueIdOrKey: z.string().min(1, "Issue ID or Key cannot be empty"),
    fields: z.preprocess(
        (val) => toStringArray(val),
        z.array(z.string()).optional()
    ).optional(),
    expand: z.preprocess(
        (val) => val === null ? undefined : String(val),
        z.string().trim().optional()
    ).optional(),
    properties: z.preprocess(
        (val) => toStringArray(val),
        z.array(z.string()).optional()
    ).optional(),
    failFast: z.preprocess(
        (val) => toBoolean(val),
        z.boolean().optional()
    ).optional(),
});

const CreateIssueSchema = z.object({
    fields: z.object({
        summary: z.string().min(1, "Summary cannot be empty"),
        description: z.string().optional(),
        project: z.object({
            key: z.string().min(1, "Project key cannot be empty")
        }),
        issuetype: z.object({
            id: z.string().optional(),
            name: z.string().optional()
        }).refine(data => data.id || data.name, {
            message: "Either id or name must be provided for issuetype"
        }),
        expand: z.preprocess(
            (val) => {
                if (val === null || val === undefined) return undefined;
                const str = String(val).trim();
                return str.length > 0 ? str : undefined;
            },
            z.string().optional()
        ),
    }).catchall(z.any()),
    update: z.record(z.array(z.any())).optional()
});

const UpdateIssueSchema = z.object({
    issueIdOrKey: z.string().min(1, "Issue ID or Key cannot be empty"),
    fields: z.record(z.any()).optional(),
    update: z.record(z.array(z.any())).optional(),
    notifyUsers: z.preprocess(
        (val) => toBoolean(val),
        z.boolean().optional()
    )
});

const GetSprintReportSchema = z.object({
    rapidViewId: z.preprocess(
        (val) => toNumber(val),
        z.number().int().positive()
    ),
    sprintId: z.preprocess(
        (val) => toNumber(val),
        z.number().int().positive()
    )
});

// Validation functions
export function validateJQLSearchArgs(args: unknown): JQLSearchArgs {
    try {
        return JQLSearchSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => {
                const path = issue.path.join('.');
                const message = issue.message;
                return `${path}: ${message}`;
            }).join('\n');
            throw new Error(`Invalid JQL Search arguments:${issues}`);
        }
        throw error;
    }
}

export function validateGetIssueArgs(args: unknown): GetIssueArgs {
    try {
        return GetIssueSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => {
                const path = issue.path.join('.');
                const message = issue.message;
                return `${path}: ${message}`;
            }).join('\n');
            throw new Error(`Invalid Get Issue arguments:${issues}`);
        }
        throw error;
    }
}

export function validateCreateIssueArgs(args: unknown): CreateIssueArgs {
    try {
        return CreateIssueSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => {
                const path = issue.path.join('.');
                const message = issue.message;
                return `${path}: ${message}`;
            }).join('\n');
            throw new Error(`Invalid Create Issue arguments:${issues}`);
        }
        throw error;
    }
}

export function validateUpdateIssueArgs(args: unknown): UpdateIssueArgs {
    try {
        return UpdateIssueSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => {
                const path = issue.path.join('.');
                const message = issue.message;
                return `${path}: ${message}`;
            }).join('\n');
            throw new Error(`Invalid Update Issue arguments:\n${issues}`);
        }
        throw error;
    }
}

export function validateGetSprintReportArgs(args: unknown): GetSprintReportArgs {
    try {
        return GetSprintReportSchema.parse(args);
    } catch (error) {
        if (error instanceof z.ZodError) {
            const issues = error.issues.map(issue => {
                const path = issue.path.join('.');
                const message = issue.message;
                return `${path}: ${message}`;
            }).join('\n');
            throw new Error(`Invalid Get Sprint Report arguments:\n${issues}`);
        }
        throw error;
    }
}

// Utility functions
export function isNonEmptyExpand(expand: string | undefined): boolean {
    return Boolean(expand && expand.trim().length > 0);
}

export function sanitizeFields(fields: unknown): string[] {
    return toStringArray(fields);
}

export function sanitizeMaxResults(maxResults: number | undefined): number {
    return maxResults || 50;
} 