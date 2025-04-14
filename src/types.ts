// JQL Search Arguments
export interface JQLSearchArgs {
  jql: string;
  nextPageToken?: string;
  maxResults?: number;
  fields?: string[];
  expand?: string;
}

// Get Issue Arguments
export interface GetIssueArgs {
  issueIdOrKey: string;
  fields?: string[];
  expand?: string;
  properties?: string[];
  failFast?: boolean;
}

// Create Issue Arguments
export interface CreateIssueArgs {
  fields: {
    summary: string;
    description?: string;
    project: {
      key: string;
    };
    issuetype: {
      id?: string;
      name?: string;
    };
    [key: string]: any;
  };
  update?: Record<string, any[]>;
}

// Update Issue Arguments
export interface UpdateIssueArgs {
  issueIdOrKey: string;
  fields?: Record<string, any>;
  update?: Record<string, any[]>;
  notifyUsers?: boolean;
}

// Get Sprint Report Arguments
export interface GetSprintReportArgs {
  rapidViewId: string | number;
  sprintId: string | number;
}

// Utility Types
export type NonEmptyString = string & { __nonEmpty: true };
export type PositiveNumber = number & { __positive: true }; 