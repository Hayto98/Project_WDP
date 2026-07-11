/**
 * Seed script — populates MongoDB with mock data matching frontend samples.
 *
 * Usage: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/database');
const {
  User, Paper, DataSource, UserCollection, PaperView,
  Notification, Feedback, CrawlerJob, Workspace, WorkspaceItem, SystemLog,
  CollaborationInvite, AnalysisReport,
} = require('../models');

async function seed() {
  await connectDB();
  console.log('🌱 Seeding database...\n');

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Paper.deleteMany({}), DataSource.deleteMany({}),
    UserCollection.deleteMany({}), PaperView.deleteMany({}),
    Notification.deleteMany({}), Feedback.deleteMany({}),
    CrawlerJob.deleteMany({}), Workspace.deleteMany({}),
    WorkspaceItem.deleteMany({}), CollaborationInvite.deleteMany({}),
    AnalysisReport.deleteMany({}),
  ]);

  /* ── 1. Users (from adminSample.ts) ── */
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = await User.insertMany([
    {
      email: 'minh.thanh@uni.edu.vn',
      password_hash: passwordHash,
      full_name: 'Minh Thành',
      status: 'Active',
      roles: ['Admin'],
      followed_subjects: [
        { type: 'Field', value: 'Large Language Models', active: true, rule: { frequency: 'daily', threshold: 'trustedSources', email: false, in_app: true, exclude: [] } },
        { type: 'Keyword', value: 'retrieval-augmented generation', active: true, rule: { frequency: 'instant', threshold: 'all', email: true, in_app: true, exclude: [] } },
        { type: 'Field', value: 'Federated Learning', active: true, rule: { frequency: 'daily', threshold: 'highCitation', email: false, in_app: true, exclude: [] } },
        { type: 'Field', value: 'Quantum Machine Learning', active: true, rule: { frequency: 'weekly', threshold: 'all', email: false, in_app: true, exclude: [] } },
      ],
    },
    {
      email: 'lan.anh@uni.edu.vn',
      password_hash: passwordHash,
      full_name: 'Lan Anh',
      status: 'Active',
      roles: ['Student'],
    },
    {
      email: 'khoa.nguyen@uni.edu.vn',
      password_hash: passwordHash,
      full_name: 'Khoa Nguyễn',
      status: 'Active',
      roles: ['Student'],
    },
    {
      email: 'huy.tran@uni.edu.vn',
      password_hash: passwordHash,
      full_name: 'Huy Trần',
      status: 'Banned',
      roles: ['Student'],
    },
    {
      email: 'thao.pham@uni.edu.vn',
      password_hash: passwordHash,
      full_name: 'Thảo Phạm',
      status: 'Active',
      roles: ['Student'],
    },
  ]);

  console.log(`✅ Users: ${users.length}`);

  /* ── 2. Papers (from searchSample.ts) ── */
  const papers = await Paper.insertMany([
    {
      title: 'Sparse Mixture-of-Experts Scaling Laws for Multilingual Reasoning',
      doi: '10.48550/arXiv.2503.01234',
      abstract: 'We derive empirical scaling laws for sparse mixture-of-experts (MoE) language models under multilingual reasoning workloads.',
      authors: [{ name: 'N. Patel', is_primary: true }, { name: 'L. Zhou' }, { name: 'A. Rossi' }, { name: 'M. Haddad' }],
      publication_year: 2025, source_name: 'arXiv', type: 'Preprint', status: 'Cleaned',
      keywords: ['mixture of experts', 'scaling laws', 'multilingual', 'reasoning'],
      research_fields: ['Large Language Models'],
      citation_count: 84, original_url: 'https://arxiv.org/',
      sources: [{ source_name: 'arXiv', external_id: '2503.01234', fetched_at: new Date() }],
    },
    {
      title: 'Communication-Efficient Federated Learning on Heterogeneous Edge Devices',
      doi: '10.1109/TMC.2025.0456',
      abstract: 'A gradient-sketching protocol reduces uplink traffic by 63% while preserving convergence guarantees.',
      authors: [{ name: 'M. Okafor', is_primary: true }, { name: 'S. Kim' }],
      publication_year: 2025, source_name: 'IEEE Xplore', type: 'Journal', status: 'Cleaned',
      keywords: ['federated learning', 'communication efficiency', 'edge devices'],
      research_fields: ['Federated Learning', 'Edge & TinyML'],
      citation_count: 41, original_url: 'https://ieeexplore.ieee.org/',
      sources: [{ source_name: 'IEEE Xplore', external_id: 'TMC.2025.0456', fetched_at: new Date() }],
    },
    {
      title: 'Graph Neural Networks for Materials Discovery: A Benchmark Study',
      doi: '10.1145/3612345.3612399',
      abstract: 'We release a benchmark of 1.2M crystalline structures and evaluate twelve GNN architectures.',
      authors: [{ name: 'R. Duarte', is_primary: true }, { name: 'H. Nakamura' }, { name: 'P. Silva' }],
      publication_year: 2024, source_name: 'OpenAlex', type: 'Conference', status: 'Cleaned',
      keywords: ['graph neural networks', 'materials discovery', 'benchmark'],
      research_fields: ['Graph Neural Networks'],
      citation_count: 156, original_url: 'https://openalex.org/',
      sources: [{ source_name: 'OpenAlex', external_id: 'W36123453612399', fetched_at: new Date() }],
    },
    {
      title: 'Variational Quantum Circuits Meet Contrastive Representation Learning',
      doi: '10.48550/arXiv.2502.09876',
      abstract: 'We show that shallow variational quantum circuits can serve as effective contrastive encoders.',
      authors: [{ name: 'E. Halvorsen', is_primary: true }, { name: 'P. Iyer' }],
      publication_year: 2025, source_name: 'arXiv', type: 'Preprint', status: 'Cleaned',
      keywords: ['variational quantum circuits', 'contrastive learning', 'representation'],
      research_fields: ['Quantum Machine Learning'],
      citation_count: 12, original_url: 'https://arxiv.org/',
      sources: [{ source_name: 'arXiv', external_id: '2502.09876', fetched_at: new Date() }],
    },
    {
      title: 'On-Device Vision Transformers Under One Million Parameters',
      doi: '10.1007/978-3-031-56789-0_14',
      abstract: 'A hybrid token-merging and 4-bit quantization pipeline yields ViT variants under 1M parameters.',
      authors: [{ name: 'C. Alvarez', is_primary: true }, { name: 'T. Berg' }, { name: 'R. Nolan' }],
      publication_year: 2024, source_name: 'Semantic Scholar', type: 'Conference', status: 'Cleaned',
      keywords: ['vision transformer', 'on-device', 'tinyml', 'quantization'],
      research_fields: ['Computer Vision', 'Edge & TinyML'],
      citation_count: 67, original_url: 'https://www.semanticscholar.org/',
      sources: [{ source_name: 'Semantic Scholar', external_id: 'SS-56789', fetched_at: new Date() }],
    },
    {
      title: 'Retrieval-Augmented Generation for Low-Resource Clinical Notes',
      doi: '10.1016/j.jbi.2025.104512',
      abstract: 'By grounding generation in a curated clinical knowledge base, our RAG pipeline reduces hallucinated medication references by 48%.',
      authors: [{ name: 'J. Fernández', is_primary: true }, { name: 'K. Adebayo' }],
      publication_year: 2025, source_name: 'Crossref', type: 'Journal', status: 'Cleaned',
      keywords: ['retrieval-augmented generation', 'clinical nlp', 'low-resource'],
      research_fields: ['Large Language Models'],
      citation_count: 29, original_url: 'https://www.crossref.org/',
      sources: [{ source_name: 'Crossref', external_id: 'jbi.2025.104512', fetched_at: new Date() }],
    },
    {
      title: 'Privacy-Preserving Aggregation with Secure Multiparty Computation',
      doi: '10.1109/SP.2024.00078',
      abstract: 'We combine secret sharing with adaptive clipping to achieve secure federated aggregation.',
      authors: [{ name: 'D. Petrov', is_primary: true }, { name: 'Y. Chen' }, { name: 'L. Marconi' }],
      publication_year: 2024, source_name: 'IEEE Xplore', type: 'Conference', status: 'Cleaned',
      keywords: ['secure aggregation', 'mpc', 'differential privacy'],
      research_fields: ['Federated Learning'],
      citation_count: 93, original_url: 'https://ieeexplore.ieee.org/',
      sources: [{ source_name: 'IEEE Xplore', external_id: 'SP.2024.00078', fetched_at: new Date() }],
    },
    {
      title: 'Efficient Large Language Model Inference for Scholarly Search Systems',
      doi: '10.1109/TKDE.2025.1234567',
      abstract: 'We study retrieval-aware inference strategies for large language models in scholarly search systems, reducing latency while preserving citation-grounded answer quality.',
      authors: [{ name: 'A. Nguyen', is_primary: true }, { name: 'M. Tran' }, { name: 'L. Zhou' }],
      publication_year: 2025, source_name: 'IEEE Xplore', type: 'Journal', status: 'Cleaned',
      keywords: ['large language models', 'scholarly search', 'retrieval-aware inference', 'citation grounding'],
      research_fields: ['Large Language Models'],
      citation_count: 58, original_url: 'https://ieeexplore.ieee.org/',
      sources: [{ source_name: 'IEEE Xplore', external_id: 'TKDE.2025.1234567', fetched_at: new Date() }],
    },
  ]);

  console.log(`✅ Papers: ${papers.length}`);

  /* ── 3. Data Sources (from adminSample.ts) ── */
  const dataSources = await DataSource.insertMany([
    { name: 'OpenAlex', api_endpoint: 'https://api.openalex.org', enabled: true, coverage: '82%', latency: '1.4s', error_rate: '0.2%', last_sync_status: 'Success' },
    { name: 'Semantic Scholar', api_endpoint: 'https://api.semanticscholar.org', enabled: true, coverage: '76%', latency: '1.9s', error_rate: '0.4%', last_sync_status: 'Success' },
    { name: 'Crossref', api_endpoint: 'https://api.crossref.org', enabled: true, coverage: '69%', latency: '4.8s', error_rate: '3.1%', last_sync_status: 'Partial' },
    { name: 'arXiv', api_endpoint: 'https://export.arxiv.org/api', enabled: true, coverage: '60%', latency: '2.1s', error_rate: '0.5%', last_sync_status: 'Success' },
    { name: 'IEEE Xplore', api_endpoint: 'https://ieeexploreapi.ieee.org', enabled: false, coverage: '54%', latency: '—', error_rate: '—', last_sync_status: 'Failed' },
    { name: 'ACM Digital Library', api_endpoint: 'https://dl.acm.org', enabled: true, coverage: 'ACM/Crossref', latency: '—', error_rate: '—', last_sync_status: 'Partial' },
    { name: 'Exa', api_endpoint: 'https://api.exa.ai', enabled: true, coverage: 'Web', latency: '—', error_rate: '—', last_sync_status: 'Partial' },
  ]);

  console.log(`✅ Data Sources: ${dataSources.length}`);

  /* ── 4. Crawler Jobs (from adminSample.ts) ── */
  const crawlerJobs = await CrawlerJob.insertMany([
    { name: 'Nightly OpenAlex ingest', source_name: 'OpenAlex', source_id: dataSources[0]._id, status: 'running', progress: 68, records_processed: 18420, owner: 'Crawler Service' },
    { name: 'arXiv AI refresh', source_name: 'arXiv', source_id: dataSources[3]._id, status: 'success', progress: 100, records_processed: 3240, owner: 'Scheduler' },
    { name: 'IEEE Xplore backfill', source_name: 'IEEE Xplore', source_id: dataSources[4]._id, status: 'warning', progress: 74, records_processed: 980, owner: 'Admin · Minh Thành', query: 'federated learning', max_records: 25, result: { imported: 0, skipped: 0, source_total: 0 } },
  ]);

  console.log(`✅ Crawler Jobs: ${crawlerJobs.length}`);

  /* ── 5. User Collections / Library (from librarySample.ts) ── */
  const minh = users[0]; // Minh Thành
  const collections = await UserCollection.insertMany([
    {
      user_id: minh._id, collection_name: 'Đọc sau', description: 'Các bài cần xem kỹ trong tuần này',
      saved_papers: [
        { paper_id: papers[0]._id, title_snapshot: papers[0].title, status: 'reading', note: 'Đọc kỹ phần routing entropy' },
        { paper_id: papers[5]._id, title_snapshot: papers[5].title, status: 'unread', note: 'Cần kiểm tra setup synthetic preference data' },
      ],
    },
    {
      user_id: minh._id, collection_name: 'Luận văn', description: 'Nguồn nền cho đề tài và chương tổng quan',
      saved_papers: [
        { paper_id: papers[0]._id, title_snapshot: papers[0].title, status: 'reading', note: 'Dùng cho phần bối cảnh mô hình' },
        { paper_id: papers[2]._id, title_snapshot: papers[2].title, status: 'done', note: 'Benchmark tốt, trích trong phần so sánh' },
      ],
    },
    {
      user_id: minh._id, collection_name: 'Federated Learning', description: 'Riêng tư, bảo mật và triển khai phân tán',
      saved_papers: [
        { paper_id: papers[1]._id, title_snapshot: papers[1].title, status: 'unread', note: 'Liên quan FL trên edge devices' },
        { paper_id: papers[6]._id, title_snapshot: papers[6].title, status: 'done', note: 'Tham khảo cho secure aggregation + DP' },
      ],
    },
  ]);

  console.log(`✅ Collections: ${collections.length}`);

  /* ── 6. Workspaces (from workspaceSample.ts) ── */
  const workspaces = await Workspace.insertMany([
    {
      name: 'AI Lab', description: 'Nhóm đọc bài và định hướng đề tài AI ứng dụng',
      owner_id: minh._id, active: true,
      members: [
        { user_id: minh._id, name: 'Minh Thành', initials: 'MT', role: 'owner' },
        { user_id: users[1]._id, name: 'Lan Anh', initials: 'LA', role: 'editor' },
        { user_id: users[2]._id, name: 'Khoa Nguyễn', initials: 'KN', role: 'viewer' },
      ],
    },
    {
      name: 'Luận văn 2026', description: 'Workspace chuẩn bị proposal và survey nền',
      owner_id: minh._id, active: true,
      members: [
        { user_id: minh._id, name: 'Minh Thành', initials: 'MT', role: 'owner' },
        { user_id: users[4]._id, name: 'Thảo Phạm', initials: 'TP', role: 'editor' },
        { user_id: users[3]._id, name: 'Huy Trần', initials: 'HT', role: 'viewer' },
      ],
    },
  ]);

  console.log(`✅ Workspaces: ${workspaces.length}`);

  /* ── 7. Workspace Items (from workspaceSample.ts) ── */
  const workItems = await WorkspaceItem.insertMany([
    {
      workspace_id: workspaces[0]._id, kind: 'task',
      title: 'Tóm tắt scaling laws cho MoE multilingual reasoning',
      status: 'doing', assignee_id: users[1]._id, paper_id: papers[0]._id, due: '08/07',
      comments: [
        { author_id: users[1]._id, author_name: 'Lan Anh', content: 'Ưu tiên biểu đồ routing entropy.' },
        { author_id: minh._id, author_name: 'Minh Thành', content: 'Cần thêm so sánh với dense model.' },
      ],
      note: 'Dùng cho phần bối cảnh mô hình ngôn ngữ lớn đa ngôn ngữ.',
    },
    {
      workspace_id: workspaces[0]._id, kind: 'discussion',
      title: 'Có nên đưa RAG y sinh vào hướng demo?',
      status: 'backlog', assignee_id: minh._id, paper_id: papers[5]._id, due: '10/07',
      comments: [
        { author_id: users[2]._id, author_name: 'Khoa Nguyễn', content: 'K. Adebayo paper có metric hallucination tốt.' },
      ],
      note: 'Thảo luận phạm vi demo, tránh mở quá rộng sang clinical NLP.',
    },
    {
      workspace_id: workspaces[1]._id, kind: 'note',
      title: 'Ghi chú benchmark GNN cho chương related work',
      status: 'done', assignee_id: users[4]._id, paper_id: papers[2]._id, due: '05/07',
      note: 'Benchmark 1.2M crystalline structures, phù hợp đoạn so sánh model đồ thị.',
    },
  ]);

  console.log(`✅ Work Items: ${workItems.length}`);

  /* ── 8. Notifications (from notificationSample.ts) ── */
  const notifications = await Notification.insertMany([
    {
      user_id: minh._id, notification_type: 'task',
      title: 'Lan Anh giao task đọc paper nền',
      content: 'Bạn được phân công tổng hợp câu hỏi nghiên cứu.',
      source: 'Workspace · AI Lab', actor: 'Lan Anh', priority: 'high',
      target_label: 'Mở workspace', target_href: '#workspace',
      meta: ['Deadline 18/07', 'Trạng thái: Cần làm'], is_read: false,
    },
    {
      user_id: minh._id, notification_type: 'paper',
      title: 'Có paper mới khớp chủ đề bạn theo dõi',
      content: 'Communication-Efficient Federated Learning vừa xuất hiện.',
      source: 'Theo dõi chủ đề', actor: 'Research Corpus', priority: 'normal',
      target_label: 'Mở theo dõi', target_href: '#follow',
      related_paper_ids: [papers[1]._id], is_read: false,
    },
    {
      user_id: minh._id, notification_type: 'trend',
      title: 'Xu hướng Federated Learning tăng bất thường',
      content: 'Số bài công bố trong 30 ngày gần nhất vượt ngưỡng.',
      source: 'Phân tích xu hướng', actor: 'Trend Engine', priority: 'high',
      target_label: 'Xem xu hướng', target_href: '#trends',
      meta: ['+24% trong 30 ngày'], is_read: false,
    },
    {
      user_id: minh._id, notification_type: 'system',
      title: 'Batch cập nhật corpus đã hoàn tất',
      content: 'Hệ thống đã đồng bộ metadata mới từ OpenAlex và Crossref.',
      source: 'Hệ thống', actor: 'Crawler Service', priority: 'low',
      target_label: 'Xem tổng quan', target_href: '#overview',
      meta: ['1.248 bản ghi mới'], is_read: true,
    },
  ]);

  console.log(`✅ Notifications: ${notifications.length}`);

  /* ── 9. Paper Views (sample) ── */
  const views = await PaperView.insertMany([
    { user_id: users[1]._id, paper_id: papers[0]._id, source: 'Search_Result', duration_minutes: 8, session_window: '12:00-12:30', device: 'desktop', persist_status: 'stored', reason: 'Đủ ngưỡng đọc' },
    { user_id: minh._id, paper_id: papers[0]._id, source: 'Library', duration_minutes: 14, session_window: '12:00-12:30', device: 'desktop', persist_status: 'stored', reason: 'Đủ ngưỡng đọc' },
    { user_id: users[2]._id, paper_id: papers[1]._id, source: 'Dashboard', duration_minutes: 5, session_window: '12:30-13:00', device: 'tablet', persist_status: 'stored', reason: 'Đủ ngưỡng đọc' },
    { user_id: users[4]._id, paper_id: papers[0]._id, source: 'Search_Result', duration_minutes: 1, session_window: '12:30-13:00', device: 'mobile', persist_status: 'skipped', reason: 'Dưới ngưỡng đọc' },
    { user_id: users[1]._id, paper_id: papers[1]._id, source: 'Search_Result', duration_minutes: 6, session_window: '13:00-13:30', device: 'desktop', persist_status: 'stored', reason: 'Đủ ngưỡng đọc' },
  ]);

  console.log(`✅ Paper Views: ${views.length}`);

  const systemLogs = await SystemLog.insertMany([
    {
      meta: { action_type: 'Login', user_id: minh._id },
      details: { actor: 'Minh Thành', action: 'Đăng nhập admin', target: 'Admin Dashboard', severity: 'info', ip: '127.0.0.1' },
    },
    {
      meta: { action_type: 'BatchJob', user_id: minh._id, source_name: 'OpenAlex' },
      details: { actor: 'Crawler Service', action: 'Chạy batch ingest', target: 'OpenAlex', severity: 'info', ip: 'system' },
    },
    {
      meta: { action_type: 'ApiError', source_name: 'IEEE Xplore' },
      details: { actor: 'Crawler Service', action: 'API nguồn trả lỗi', target: 'IEEE Xplore', severity: 'warning', ip: 'system' },
    },
  ]);

  console.log(`✅ System Logs: ${systemLogs.length}`);

  /* ── Done ── */
  console.log('\n✅ Seed complete!');
  console.log(`   Login: minh.thanh@uni.edu.vn / password123 (Admin)`);
  console.log(`   Login: lan.anh@uni.edu.vn / password123 (Student)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
