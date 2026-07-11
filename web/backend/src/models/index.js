/**
 * Central model index — re-exports all Mongoose models.
 */

module.exports = {
  User: require('./User'),
  Paper: require('./Paper'),
  DataSource: require('./DataSource'),
  UserCollection: require('./UserCollection'),
  PaperView: require('./PaperView'),
  SystemLog: require('./SystemLog'),
  AnalysisReport: require('./AnalysisReport'),
  Notification: require('./Notification'),
  Feedback: require('./Feedback'),
  CrawlerJob: require('./CrawlerJob'),
  Workspace: require('./Workspace'),
  WorkspaceItem: require('./WorkspaceItem'),
  WorkspaceActivity: require('./WorkspaceActivity'),
  CollaborationInvite: require('./CollaborationInvite'),
};
