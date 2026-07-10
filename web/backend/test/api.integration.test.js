const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

const { app } = require('../src/app');
const { mongodbUri } = require('../src/config/env');
const User = require('../src/models/User');
const Workspace = require('../src/models/Workspace');
const WorkspaceItem = require('../src/models/WorkspaceItem');
const WorkspaceActivity = require('../src/models/WorkspaceActivity');
const Paper = require('../src/models/Paper');
const Feedback = require('../src/models/Feedback');

let server;
let baseUrl;

async function startServer() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongodbUri);
  }

  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}/api/v1`;
      resolve();
    });
  });
}

async function stopServer() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

function auth(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

async function login(email, password) {
  const { res, body } = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200);
  return body.data;
}

async function createAdmin(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  await User.deleteOne({ email });
  return User.create({
    email,
    password_hash: passwordHash,
    full_name: 'API Test Admin',
    roles: ['Admin'],
    status: 'Active',
  });
}

async function cleanup() {
  const testUsers = await User.find({ email: /@wdp-test\.example\.com$/ }).select('_id').lean();
  const userIds = testUsers.map((user) => user._id);
  const workspaces = await Workspace.find({
    $or: [
      { name: /^API Test/ },
      { owner_id: { $in: userIds } },
      { 'members.user_id': { $in: userIds } },
    ],
  }).select('_id').lean();
  const workspaceIds = workspaces.map((workspace) => workspace._id);

  await Promise.all([
    WorkspaceActivity.deleteMany({ workspace_id: { $in: workspaceIds } }),
    WorkspaceItem.deleteMany({ workspace_id: { $in: workspaceIds } }),
    Workspace.deleteMany({ _id: { $in: workspaceIds } }),
    Feedback.deleteMany({ user_id: { $in: userIds } }),
    User.deleteMany({ email: /@wdp-test\.example\.com$/ }),
    Paper.deleteMany({ title: /^API Test Related/ }),
  ]);
}

test.before(async () => {
  await startServer();
  await cleanup();
});

test.after(async () => {
  await cleanup();
  await stopServer();
});

test('auth refresh and change password flow works end to end', async () => {
  const email = `auth-${Date.now()}@wdp-test.example.com`;

  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Password123!',
      full_name: 'API Test User',
    }),
  });
  assert.equal(register.res.status, 201);
  assert.equal(register.body.success, true);

  const session = await login(email, 'Password123!');
  assert.ok(session.accessToken);
  assert.ok(session.refreshToken);

  const refresh = await request('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  assert.equal(refresh.res.status, 200);
  assert.ok(refresh.body.data.accessToken);

  const wrongPassword = await request('/auth/change-password', {
    method: 'PUT',
    headers: auth(session.accessToken),
    body: JSON.stringify({
      currentPassword: 'wrong-password',
      newPassword: 'Password456!',
    }),
  });
  assert.equal(wrongPassword.res.status, 400);
  assert.equal(wrongPassword.body.error.code, 'VALIDATION_ERROR');

  const change = await request('/auth/change-password', {
    method: 'PUT',
    headers: auth(session.accessToken),
    body: JSON.stringify({
      currentPassword: 'Password123!',
      newPassword: 'Password456!',
    }),
  });
  assert.equal(change.res.status, 200);

  const oldLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Password123!' }),
  });
  assert.equal(oldLogin.res.status, 401);

  const newLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: 'Password456!' }),
  });
  assert.equal(newLogin.res.status, 200);
});

test('workspace mutations write readable activity audit rows', async () => {
  const email = `workspace-${Date.now()}@wdp-test.example.com`;
  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Password123!',
      full_name: 'API Workspace User',
    }),
  });
  assert.equal(register.res.status, 201);
  const accessToken = register.body.data.accessToken;

  const workspace = await request('/workspaces', {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({
      name: 'API Test Workspace',
      description: 'integration workspace',
      owner_name: 'API Workspace User',
      owner_initials: 'AW',
    }),
  });
  assert.equal(workspace.res.status, 201);
  const workspaceId = workspace.body.data._id;

  const item = await request(`/workspaces/${workspaceId}/items`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({
      kind: 'task',
      title: 'API Test Item',
      status: 'backlog',
      note: 'integration item',
    }),
  });
  assert.equal(item.res.status, 201);
  const itemId = item.body.data._id;

  const comment = await request(`/workspaces/${workspaceId}/items/${itemId}/comments`, {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({
      content: 'integration comment',
      author_name: 'API Workspace User',
    }),
  });
  assert.equal(comment.res.status, 201);

  const activities = await request(`/workspaces/${workspaceId}/activities`, {
    headers: auth(accessToken),
  });
  assert.equal(activities.res.status, 200);
  const types = activities.body.data.map((activity) => activity.type);
  assert.deepEqual(types.slice(0, 3), ['comment_added', 'item_created', 'workspace_created']);
  assert.equal(activities.body.data[0].actor, email);
});

test('workspace permissions enforce viewer editor and nonmember access', async () => {
  const stamp = Date.now();
  const ownerEmail = `workspace-owner-${stamp}@wdp-test.example.com`;
  const viewerEmail = `workspace-viewer-${stamp}@wdp-test.example.com`;
  const editorEmail = `workspace-editor-${stamp}@wdp-test.example.com`;
  const outsiderEmail = `workspace-outsider-${stamp}@wdp-test.example.com`;

  const owner = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: ownerEmail, password: 'Password123!', full_name: 'API Workspace Owner' }),
  });
  const viewer = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: viewerEmail, password: 'Password123!', full_name: 'API Workspace Viewer' }),
  });
  const editor = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: editorEmail, password: 'Password123!', full_name: 'API Workspace Editor' }),
  });
  const outsider = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: outsiderEmail, password: 'Password123!', full_name: 'API Workspace Outsider' }),
  });
  assert.equal(owner.res.status, 201);
  assert.equal(viewer.res.status, 201);
  assert.equal(editor.res.status, 201);
  assert.equal(outsider.res.status, 201);

  const ownerToken = owner.body.data.accessToken;
  const viewerToken = viewer.body.data.accessToken;
  const editorToken = editor.body.data.accessToken;
  const outsiderToken = outsider.body.data.accessToken;

  const workspace = await request('/workspaces', {
    method: 'POST',
    headers: auth(ownerToken),
    body: JSON.stringify({
      name: 'API Test Permission Workspace',
      description: 'permission workspace',
      owner_name: 'API Workspace Owner',
      owner_initials: 'AO',
    }),
  });
  assert.equal(workspace.res.status, 201);
  const workspaceId = workspace.body.data._id;

  const addViewer = await request(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: auth(ownerToken),
    body: JSON.stringify({
      user_id: viewer.body.data.user.id,
      name: 'API Workspace Viewer',
      initials: 'AV',
      role: 'viewer',
    }),
  });
  assert.equal(addViewer.res.status, 201);

  const addEditor = await request(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    headers: auth(ownerToken),
    body: JSON.stringify({
      user_id: editor.body.data.user.id,
      name: 'API Workspace Editor',
      initials: 'AE',
      role: 'editor',
    }),
  });
  assert.equal(addEditor.res.status, 201);

  const ownerItem = await request(`/workspaces/${workspaceId}/items`, {
    method: 'POST',
    headers: auth(ownerToken),
    body: JSON.stringify({ kind: 'task', title: 'Permission Item', status: 'backlog' }),
  });
  assert.equal(ownerItem.res.status, 201);
  const itemId = ownerItem.body.data._id;

  const viewerList = await request(`/workspaces/${workspaceId}/items`, {
    headers: auth(viewerToken),
  });
  assert.equal(viewerList.res.status, 200);

  const viewerCreate = await request(`/workspaces/${workspaceId}/items`, {
    method: 'POST',
    headers: auth(viewerToken),
    body: JSON.stringify({ kind: 'task', title: 'Viewer should not create' }),
  });
  assert.equal(viewerCreate.res.status, 403);

  const viewerComment = await request(`/workspaces/${workspaceId}/items/${itemId}/comments`, {
    method: 'POST',
    headers: auth(viewerToken),
    body: JSON.stringify({ content: 'viewer can comment', author_name: 'API Workspace Viewer' }),
  });
  assert.equal(viewerComment.res.status, 201);

  const editorUpdate = await request(`/workspaces/${workspaceId}/items/${itemId}`, {
    method: 'PUT',
    headers: auth(editorToken),
    body: JSON.stringify({ status: 'doing' }),
  });
  assert.equal(editorUpdate.res.status, 200);
  assert.equal(editorUpdate.body.data.status, 'doing');

  const viewerInvite = await request('/collaboration/invites', {
    method: 'POST',
    headers: auth(viewerToken),
    body: JSON.stringify({
      workspace_id: workspaceId,
      invitee_email: `viewer-invite-${stamp}@wdp-test.example.com`,
      direction: 'outgoing',
      topic: 'Permission invite',
      message: 'viewer should not invite',
    }),
  });
  assert.equal(viewerInvite.res.status, 403);

  const editorInvite = await request('/collaboration/invites', {
    method: 'POST',
    headers: auth(editorToken),
    body: JSON.stringify({
      workspace_id: workspaceId,
      invitee_email: `editor-invite-${stamp}@wdp-test.example.com`,
      direction: 'outgoing',
      topic: 'Permission invite',
      message: 'editor can invite',
    }),
  });
  assert.equal(editorInvite.res.status, 201);

  const outsiderList = await request(`/workspaces/${workspaceId}/items`, {
    headers: auth(outsiderToken),
  });
  assert.equal(outsiderList.res.status, 403);
});

test('admin can refresh analysis reports', async () => {
  const email = `admin-${Date.now()}@wdp-test.example.com`;
  await createAdmin(email, 'AdminPass123!');
  const session = await login(email, 'AdminPass123!');

  const refresh = await request('/admin/reports/refresh', {
    method: 'POST',
    headers: auth(session.accessToken),
  });

  assert.equal(refresh.res.status, 200);
  assert.equal(refresh.body.success, true);
  assert.ok(Array.isArray(refresh.body.data.reports));
});

test('feedback flow lets users submit and admin resolve', async () => {
  const userEmail = `feedback-user-${Date.now()}@wdp-test.example.com`;
  const adminEmail = `feedback-admin-${Date.now()}@wdp-test.example.com`;

  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: userEmail,
      password: 'Password123!',
      full_name: 'API Feedback User',
    }),
  });
  assert.equal(register.res.status, 201);
  const userToken = register.body.data.accessToken;

  const created = await request('/feedbacks', {
    method: 'POST',
    headers: auth(userToken),
    body: JSON.stringify({ content: 'API Test feedback content' }),
  });
  assert.equal(created.res.status, 201);
  assert.equal(created.body.data.status, 'Pending');
  const feedbackId = created.body.data._id;

  const ownList = await request('/feedbacks', {
    headers: auth(userToken),
  });
  assert.equal(ownList.res.status, 200);
  assert.equal(ownList.body.data.length, 1);

  await createAdmin(adminEmail, 'AdminPass123!');
  const adminSession = await login(adminEmail, 'AdminPass123!');

  const adminList = await request('/feedbacks', {
    headers: auth(adminSession.accessToken),
  });
  assert.equal(adminList.res.status, 200);
  const row = adminList.body.data.find((item) => item._id === feedbackId);
  assert.equal(row.user_id.email, userEmail);

  const updated = await request(`/feedbacks/${feedbackId}`, {
    method: 'PUT',
    headers: auth(adminSession.accessToken),
    body: JSON.stringify({ status: 'Resolved', admin_note: 'Handled in integration test' }),
  });
  assert.equal(updated.res.status, 200);
  assert.equal(updated.body.data.status, 'Resolved');
  assert.equal(updated.body.data.admin_note, 'Handled in integration test');
});

test('user profile update works and rejects duplicate email', async () => {
  const firstEmail = `profile-a-${Date.now()}@wdp-test.example.com`;
  const secondEmail = `profile-b-${Date.now()}@wdp-test.example.com`;

  const first = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: firstEmail,
      password: 'Password123!',
      full_name: 'API Profile User A',
    }),
  });
  assert.equal(first.res.status, 201);
  const accessToken = first.body.data.accessToken;

  const second = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: secondEmail,
      password: 'Password123!',
      full_name: 'API Profile User B',
    }),
  });
  assert.equal(second.res.status, 201);

  const update = await request('/users/me', {
    method: 'PUT',
    headers: auth(accessToken),
    body: JSON.stringify({
      full_name: 'API Profile User Updated',
      email: `profile-updated-${Date.now()}@wdp-test.example.com`,
    }),
  });
  assert.equal(update.res.status, 200);
  assert.equal(update.body.data.full_name, 'API Profile User Updated');

  const duplicate = await request('/users/me', {
    method: 'PUT',
    headers: auth(accessToken),
    body: JSON.stringify({ email: secondEmail }),
  });
  assert.equal(duplicate.res.status, 409);
  assert.equal(duplicate.body.error.code, 'CONFLICT');
});

test('ai related papers returns corpus recommendations', async () => {
  const email = `related-${Date.now()}@wdp-test.example.com`;
  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'Password123!',
      full_name: 'API Related User',
    }),
  });
  assert.equal(register.res.status, 201);
  const accessToken = register.body.data.accessToken;

  await Paper.create([
    {
      title: 'API Test Related Agent Harness A',
      title_normalized: 'api test related agent harness a',
      abstract: 'Agent harness evaluation.',
      publication_year: 2026,
      source_name: 'OpenAlex',
      type: 'Conference',
      original_url: 'https://example.com/api-related-a',
      keywords: ['agent harness', 'evaluation'],
      research_fields: ['Agent Evaluation'],
      authors: [{ name: 'Minh Tran', is_primary: true }],
      sources: [{ source_name: 'OpenAlex', external_id: 'api-related-a', fetched_at: new Date() }],
    },
    {
      title: 'API Test Related Agent Harness B',
      title_normalized: 'api test related agent harness b',
      abstract: 'Related agent harness benchmark.',
      publication_year: 2025,
      source_name: 'Crossref',
      type: 'Journal',
      original_url: 'https://example.com/api-related-b',
      keywords: ['agent harness', 'benchmark'],
      research_fields: ['Agent Evaluation'],
      authors: [{ name: 'Lan Nguyen', is_primary: true }],
      sources: [{ source_name: 'Crossref', external_id: 'api-related-b', fetched_at: new Date() }],
    },
  ]);

  const related = await request('/ai/related-papers', {
    method: 'POST',
    headers: auth(accessToken),
    body: JSON.stringify({
      title: 'Agent harness evaluation',
      keywords: ['agent harness'],
      fields: ['Agent Evaluation'],
      limit: 3,
    }),
  });

  assert.equal(related.res.status, 200);
  assert.equal(related.body.success, true);
  assert.ok(related.body.data.related.length >= 1);
  assert.match(related.body.data.related[0].title, /API Test Related/);
});
