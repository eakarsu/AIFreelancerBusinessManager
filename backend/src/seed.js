import pool from './config/database.js';
import schema from './models/schema.js';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('  Dropping and recreating tables...');
    await pool.query(schema);

    // Create demo user
    const hashedPassword = await bcrypt.hash(process.env.DEMO_PASSWORD || 'demo123456', 10);
    const userResult = await pool.query(
      'INSERT INTO users (email, password, name, role) VALUES ($1, $2, $3, $4) RETURNING id',
      [process.env.DEMO_EMAIL || 'demo@freelancer.com', hashedPassword, 'Alex Morgan', 'user']
    );
    const userId = userResult.rows[0].id;

    // Seed Clients (16)
    const clientsData = [
      ['TechVision Inc', 'sarah@techvision.io', '(415) 555-0101', 'TechVision Inc', 'Technology', 'active'],
      ['GreenLeaf Studios', 'mark@greenleaf.co', '(310) 555-0102', 'GreenLeaf Studios', 'Design', 'active'],
      ['Quantum Dynamics', 'lisa@quantumdyn.com', '(212) 555-0103', 'Quantum Dynamics', 'Finance', 'active'],
      ['BlueSky Marketing', 'james@bluesky.com', '(305) 555-0104', 'BlueSky Marketing', 'Marketing', 'active'],
      ['Stellar Retail', 'emma@stellar.shop', '(503) 555-0105', 'Stellar Retail', 'E-commerce', 'active'],
      ['Nova Health', 'dr.chen@novahealth.io', '(617) 555-0106', 'Nova Health', 'Healthcare', 'active'],
      ['Atlas Logistics', 'tom@atlaslog.com', '(713) 555-0107', 'Atlas Logistics', 'Logistics', 'active'],
      ['Pinnacle Education', 'anna@pinnacle.edu', '(202) 555-0108', 'Pinnacle Education', 'Education', 'active'],
      ['Crimson Agency', 'dev@crimson.agency', '(312) 555-0109', 'Crimson Agency', 'Agency', 'active'],
      ['Velocity Sports', 'coach@velocity.fit', '(480) 555-0110', 'Velocity Sports', 'Sports', 'active'],
      ['Meridian Foods', 'chef@meridian.food', '(615) 555-0111', 'Meridian Foods', 'Food & Beverage', 'active'],
      ['Horizon Real Estate', 'broker@horizon.re', '(858) 555-0112', 'Horizon Real Estate', 'Real Estate', 'prospect'],
      ['Nexus AI Labs', 'research@nexusai.com', '(650) 555-0113', 'Nexus AI Labs', 'AI/ML', 'active'],
      ['Orbit Media', 'press@orbitmedia.co', '(323) 555-0114', 'Orbit Media', 'Media', 'inactive'],
      ['Summit Legal', 'atty@summitlegal.com', '(404) 555-0115', 'Summit Legal', 'Legal', 'prospect'],
      ['Forge Manufacturing', 'ops@forgemfg.com', '(216) 555-0116', 'Forge Manufacturing', 'Manufacturing', 'active'],
    ];
    const clientIds = [];
    for (const c of clientsData) {
      const r = await pool.query('INSERT INTO clients (user_id, name, email, phone, company, industry, status) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
        [userId, ...c]);
      clientIds.push(r.rows[0].id);
    }

    // Seed Projects (16)
    const projectsData = [
      [clientIds[0], 'TechVision Website Redesign', 'Complete redesign of corporate website with React and Next.js', 'active', 15000, 8500, '2025-12-01', '2026-03-15', '2026-03-15', 'high'],
      [clientIds[1], 'GreenLeaf Portfolio Platform', 'Custom portfolio showcase platform for creative agency', 'active', 8500, 3200, '2026-01-15', '2026-04-30', '2026-04-30', 'medium'],
      [clientIds[2], 'Quantum Finance Dashboard', 'Real-time financial analytics dashboard', 'active', 25000, 12000, '2025-11-01', '2026-05-01', '2026-05-01', 'high'],
      [clientIds[3], 'BlueSky Campaign Tracker', 'Marketing campaign analytics and reporting tool', 'completed', 6000, 6000, '2025-09-01', '2025-12-15', '2025-12-15', 'medium'],
      [clientIds[4], 'Stellar E-commerce Platform', 'Full e-commerce solution with payment integration', 'active', 35000, 18000, '2025-10-01', '2026-06-01', '2026-06-01', 'high'],
      [clientIds[5], 'Nova Patient Portal', 'HIPAA-compliant patient portal and booking system', 'active', 20000, 5000, '2026-02-01', '2026-07-01', '2026-07-01', 'high'],
      [clientIds[6], 'Atlas Tracking System', 'Real-time shipment tracking dashboard', 'paused', 12000, 7500, '2025-11-15', '2026-03-01', '2026-03-01', 'medium'],
      [clientIds[7], 'Pinnacle LMS Platform', 'Learning management system with video integration', 'active', 18000, 9000, '2026-01-01', '2026-06-15', '2026-06-15', 'medium'],
      [clientIds[8], 'Crimson Client Portal', 'Agency client management portal', 'completed', 9000, 9000, '2025-08-01', '2025-11-30', '2025-11-30', 'low'],
      [clientIds[9], 'Velocity Fitness App', 'Mobile-responsive fitness tracking web app', 'active', 14000, 6500, '2026-01-15', '2026-05-15', '2026-05-15', 'medium'],
      [clientIds[10], 'Meridian Order System', 'Online ordering and delivery management system', 'active', 16000, 4000, '2026-02-15', '2026-06-30', '2026-06-30', 'medium'],
      [clientIds[11], 'Horizon Property Listings', 'Property listing website with virtual tours', 'draft', 22000, 0, '2026-04-01', '2026-08-01', '2026-08-01', 'low'],
      [clientIds[12], 'Nexus ML Dashboard', 'Machine learning model monitoring dashboard', 'active', 30000, 15000, '2025-12-15', '2026-05-30', '2026-05-30', 'high'],
      [clientIds[0], 'TechVision Mobile App', 'React Native companion app for website', 'draft', 20000, 0, '2026-05-01', '2026-09-01', '2026-09-01', 'medium'],
      [clientIds[8], 'Crimson Brand Refresh', 'Rebranding and design system creation', 'active', 7500, 3000, '2026-03-01', '2026-05-01', '2026-05-01', 'low'],
      [clientIds[15], 'Forge Inventory System', 'Inventory management web application', 'active', 11000, 2000, '2026-03-15', '2026-07-15', '2026-07-15', 'medium'],
    ];
    const projectIds = [];
    for (const p of projectsData) {
      const r = await pool.query('INSERT INTO projects (user_id, client_id, name, description, status, budget, spent, start_date, end_date, deadline, priority) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id',
        [userId, ...p]);
      projectIds.push(r.rows[0].id);
    }

    // Seed Invoices (16)
    const invoicesData = [
      [clientIds[0], projectIds[0], 'INV-2025-001', 5000, 450, 'paid', '2025-12-31', '2025-12-28'],
      [clientIds[0], projectIds[0], 'INV-2026-002', 3500, 315, 'paid', '2026-01-31', '2026-01-30'],
      [clientIds[2], projectIds[2], 'INV-2026-003', 8000, 720, 'sent', '2026-02-28', null],
      [clientIds[1], projectIds[1], 'INV-2026-004', 3200, 288, 'paid', '2026-02-15', '2026-02-14'],
      [clientIds[4], projectIds[4], 'INV-2026-005', 10000, 900, 'sent', '2026-03-15', null],
      [clientIds[4], projectIds[4], 'INV-2026-006', 8000, 720, 'overdue', '2026-02-01', null],
      [clientIds[3], projectIds[3], 'INV-2025-007', 6000, 540, 'paid', '2025-12-15', '2025-12-10'],
      [clientIds[5], projectIds[5], 'INV-2026-008', 5000, 450, 'draft', '2026-04-01', null],
      [clientIds[7], projectIds[7], 'INV-2026-009', 4500, 405, 'sent', '2026-03-31', null],
      [clientIds[6], projectIds[6], 'INV-2026-010', 7500, 675, 'paid', '2026-01-15', '2026-01-20'],
      [clientIds[8], projectIds[8], 'INV-2025-011', 9000, 810, 'paid', '2025-12-01', '2025-11-28'],
      [clientIds[9], projectIds[9], 'INV-2026-012', 3500, 315, 'sent', '2026-03-15', null],
      [clientIds[10], projectIds[10], 'INV-2026-013', 4000, 360, 'draft', '2026-04-15', null],
      [clientIds[12], projectIds[12], 'INV-2026-014', 10000, 900, 'sent', '2026-03-01', null],
      [clientIds[12], projectIds[12], 'INV-2026-015', 5000, 450, 'paid', '2026-01-31', '2026-02-01'],
      [clientIds[15], projectIds[15], 'INV-2026-016', 2000, 180, 'draft', '2026-04-30', null],
    ];
    for (const inv of invoicesData) {
      await pool.query('INSERT INTO invoices (user_id, client_id, project_id, invoice_number, amount, tax, status, due_date, paid_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [userId, ...inv]);
    }

    // Seed Contracts (16)
    const contractsData = [
      [clientIds[0], projectIds[0], 'TechVision Website Development Agreement', 'fixed-price', 15000, 'active', '2025-12-01', '2026-03-15', 'Fixed price, 3 milestone payments, IP transfer on completion'],
      [clientIds[1], projectIds[1], 'GreenLeaf Portfolio Development', 'fixed-price', 8500, 'active', '2026-01-15', '2026-04-30', '50% upfront, 50% on delivery'],
      [clientIds[2], projectIds[2], 'Quantum Dashboard Development & Support', 'hourly', 25000, 'active', '2025-11-01', '2026-05-01', 'Hourly rate $150/hr, monthly invoicing, 60-day support included'],
      [clientIds[3], projectIds[3], 'BlueSky Campaign Tool Agreement', 'fixed-price', 6000, 'completed', '2025-09-01', '2025-12-15', 'Fixed deliverables, 30-day warranty'],
      [clientIds[4], projectIds[4], 'Stellar E-commerce Full Build', 'fixed-price', 35000, 'active', '2025-10-01', '2026-06-01', '5 milestone payments, source code included, 90-day support'],
      [clientIds[5], projectIds[5], 'Nova Health Portal NDA', 'retainer', 20000, 'active', '2026-02-01', '2027-02-01', 'NDA + HIPAA compliance, monthly retainer $3k'],
      [clientIds[6], projectIds[6], 'Atlas Tracking Dashboard', 'hourly', 12000, 'signed', '2025-11-15', '2026-03-01', 'Hourly $125/hr, pause clause included'],
      [clientIds[7], projectIds[7], 'Pinnacle LMS Development', 'fixed-price', 18000, 'active', '2026-01-01', '2026-06-15', '4 milestone payments, training included'],
      [clientIds[8], projectIds[8], 'Crimson Portal Service Agreement', 'fixed-price', 9000, 'completed', '2025-08-01', '2025-11-30', 'Standard web dev terms'],
      [clientIds[9], projectIds[9], 'Velocity App Development', 'fixed-price', 14000, 'active', '2026-01-15', '2026-05-15', '3 milestones, mobile-responsive requirement'],
      [clientIds[10], projectIds[10], 'Meridian Order System Agreement', 'hourly', 16000, 'active', '2026-02-15', '2026-06-30', 'Hourly $140/hr, integration support included'],
      [clientIds[12], projectIds[12], 'Nexus ML Dashboard & Consulting', 'retainer', 30000, 'active', '2025-12-15', '2026-05-30', 'Monthly retainer $5k, includes consulting hours'],
      [clientIds[0], null, 'TechVision NDA', 'retainer', 0, 'signed', '2025-11-01', '2026-11-01', 'Standard NDA, 1 year term'],
      [clientIds[5], null, 'Nova Health BAA', 'retainer', 0, 'signed', '2026-01-15', '2027-01-15', 'Business Associate Agreement for HIPAA'],
      [clientIds[15], projectIds[15], 'Forge Inventory System Agreement', 'fixed-price', 11000, 'draft', '2026-03-15', '2026-07-15', '2 milestone payments'],
      [clientIds[11], null, 'Horizon Property Site Proposal Terms', 'fixed-price', 22000, 'draft', '2026-04-01', '2026-08-01', 'Pending client approval'],
    ];
    for (const ct of contractsData) {
      await pool.query('INSERT INTO contracts (user_id, client_id, project_id, title, contract_type, value, status, start_date, end_date, key_terms) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [userId, ...ct]);
    }

    // Seed Time Entries (16)
    const timeData = [
      [projectIds[0], 'Frontend component development - header and navigation', 6.5, 150, '2026-04-07', true],
      [projectIds[0], 'API integration and data fetching layer', 4.0, 150, '2026-04-08', true],
      [projectIds[2], 'Dashboard chart components and real-time updates', 7.0, 150, '2026-04-07', true],
      [projectIds[2], 'Financial data aggregation endpoints', 5.5, 150, '2026-04-08', true],
      [projectIds[1], 'Portfolio gallery with lightbox feature', 3.5, 125, '2026-04-06', true],
      [projectIds[4], 'Payment gateway integration - Stripe', 8.0, 150, '2026-04-07', true],
      [projectIds[4], 'Shopping cart and checkout flow', 6.0, 150, '2026-04-08', true],
      [projectIds[5], 'Patient authentication and HIPAA audit logging', 5.0, 175, '2026-04-07', true],
      [projectIds[7], 'Video player component and progress tracking', 4.5, 140, '2026-04-08', true],
      [projectIds[9], 'Exercise tracking UI and data visualization', 3.0, 130, '2026-04-06', true],
      [projectIds[10], 'Menu management and order workflow', 5.5, 140, '2026-04-07', true],
      [projectIds[12], 'ML model metrics dashboard widgets', 7.5, 175, '2026-04-08', true],
      [projectIds[14], 'Design system tokens and component library', 3.0, 125, '2026-04-06', true],
      [projectIds[15], 'Inventory CRUD and barcode scanning', 4.0, 130, '2026-04-07', true],
      [projectIds[0], 'Client meeting and requirement review', 1.5, 150, '2026-04-05', false],
      [projectIds[2], 'Code review and testing', 2.5, 150, '2026-04-09', true],
    ];
    for (const te of timeData) {
      await pool.query('INSERT INTO time_entries (user_id, project_id, description, hours, hourly_rate, date, billable) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, ...te]);
    }

    // Seed Expenses (16)
    const expensesData = [
      [projectIds[0], 'Figma Pro Annual Subscription', 144, 'software', '2026-01-15', true],
      [null, 'MacBook Pro M3 - Development Machine', 2499, 'equipment', '2025-12-01', true],
      [null, 'WeWork Co-working Space - Monthly', 450, 'office', '2026-04-01', true],
      [projectIds[4], 'Stripe Payment Processing Fees', 125, 'fees', '2026-03-15', true],
      [null, 'GitHub Pro Subscription', 48, 'software', '2026-01-01', true],
      [null, 'Adobe Creative Cloud', 659.88, 'software', '2026-01-10', true],
      [projectIds[5], 'HIPAA Compliance Training Course', 299, 'education', '2026-02-01', true],
      [null, 'Business Insurance - Annual', 1200, 'insurance', '2026-01-01', true],
      [null, 'Vercel Pro Hosting Plan', 240, 'hosting', '2026-01-01', true],
      [projectIds[2], 'AWS Services - Monthly', 187.50, 'hosting', '2026-03-01', true],
      [null, 'Udemy Course - Advanced React Patterns', 89.99, 'education', '2026-02-15', true],
      [null, 'Conference Ticket - React Summit', 599, 'education', '2026-03-01', true],
      [null, 'Ergonomic Standing Desk', 649, 'equipment', '2026-01-20', true],
      [null, 'Internet Service - Monthly', 89.99, 'utilities', '2026-04-01', true],
      [projectIds[12], 'GPU Cloud Computing - Monthly', 350, 'hosting', '2026-03-01', true],
      [null, 'Domain Renewals (5 domains)', 85, 'hosting', '2026-02-01', true],
    ];
    for (const e of expensesData) {
      await pool.query('INSERT INTO expenses (user_id, project_id, description, amount, category, date, tax_deductible) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [userId, ...e]);
    }

    // Seed Proposals (16)
    const proposalsData = [
      [clientIds[0], 'TechVision Website Redesign Proposal', 'Complete redesign with modern React/Next.js stack, responsive design, CMS integration', 15000, 'accepted', '2025-11-15', '2025-11-20'],
      [clientIds[1], 'GreenLeaf Portfolio Platform Proposal', 'Custom portfolio with image optimization, filtering, and CMS', 8500, 'accepted', '2025-12-20', '2026-01-05'],
      [clientIds[2], 'Quantum Financial Dashboard Proposal', 'Real-time analytics dashboard with WebSocket data feeds', 25000, 'accepted', '2025-10-15', '2025-10-25'],
      [clientIds[4], 'Stellar E-commerce Complete Solution', 'Full e-commerce with Stripe, inventory management, and admin panel', 35000, 'accepted', '2025-09-10', '2025-09-20'],
      [clientIds[11], 'Horizon Property Listing Website', 'Property listings with virtual tours, map integration, and lead capture', 22000, 'sent', '2026-03-20', null],
      [clientIds[5], 'Nova Health Patient Portal', 'HIPAA-compliant portal with booking, messaging, and records', 20000, 'accepted', '2026-01-10', '2026-01-20'],
      [clientIds[14], 'Summit Legal Case Management System', 'Custom case management with document storage and calendar', 28000, 'sent', '2026-03-25', null],
      [clientIds[9], 'Velocity Fitness Tracking App', 'Progressive web app for workout tracking and analytics', 14000, 'accepted', '2025-12-10', '2025-12-20'],
      [clientIds[10], 'Meridian Online Ordering System', 'Restaurant ordering with delivery tracking and kitchen display', 16000, 'accepted', '2026-01-25', '2026-02-05'],
      [clientIds[13], 'Orbit Media CMS Rebuild', 'Headless CMS with multi-channel publishing', 18000, 'rejected', '2025-10-01', '2025-10-20'],
      [clientIds[15], 'Forge Inventory Management System', 'Barcode scanning, stock alerts, and reporting', 11000, 'accepted', '2026-02-28', '2026-03-10'],
      [clientIds[12], 'Nexus AI Model Dashboard v2', 'Enhanced ML monitoring with automated alerts and A/B testing', 15000, 'draft', null, null],
      [clientIds[6], 'Atlas Real-time Tracking Enhancement', 'GPS integration and predictive ETA system', 8000, 'sent', '2026-04-01', null],
      [clientIds[7], 'Pinnacle Mobile Learning App', 'Companion mobile app for the LMS platform', 12000, 'draft', null, null],
      [clientIds[3], 'BlueSky Social Media Dashboard', 'Social analytics aggregation and reporting tool', 9500, 'expired', '2025-07-01', null],
      [clientIds[0], 'TechVision Mobile Companion App', 'React Native app with shared component library', 20000, 'sent', '2026-04-05', null],
    ];
    for (const pr of proposalsData) {
      await pool.query('INSERT INTO proposals (user_id, client_id, title, description, proposed_amount, status, sent_date, response_date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [userId, ...pr]);
    }

    // Seed Tasks (16)
    const tasksData = [
      [projectIds[0], 'Implement responsive navigation component', 'Build mobile-first nav with hamburger menu', 'done', 'high', '2026-04-05', 4, 3.5],
      [projectIds[0], 'Set up CI/CD pipeline', 'Configure GitHub Actions for auto-deploy', 'in_progress', 'high', '2026-04-12', 3, null],
      [projectIds[0], 'SEO optimization and meta tags', 'Add structured data and optimize meta', 'todo', 'medium', '2026-04-15', 2, null],
      [projectIds[2], 'Build real-time chart components', 'D3.js charts with WebSocket updates', 'in_progress', 'high', '2026-04-10', 8, null],
      [projectIds[2], 'Implement data export to CSV/PDF', 'Export functionality for all report views', 'todo', 'medium', '2026-04-18', 4, null],
      [projectIds[4], 'Stripe webhook handler', 'Handle payment confirmations and refunds', 'done', 'urgent', '2026-04-03', 5, 6],
      [projectIds[4], 'Product search and filtering', 'Elasticsearch integration for product search', 'in_progress', 'high', '2026-04-12', 6, null],
      [projectIds[4], 'Admin dashboard - order management', 'Order list, status updates, and tracking', 'todo', 'high', '2026-04-20', 8, null],
      [projectIds[5], 'HIPAA audit logging system', 'Log all PHI access events', 'in_progress', 'urgent', '2026-04-10', 6, null],
      [projectIds[5], 'Appointment booking calendar', 'Interactive calendar with availability slots', 'todo', 'high', '2026-04-22', 5, null],
      [projectIds[7], 'Video player with progress tracking', 'Custom video player with resume capability', 'review', 'high', '2026-04-08', 5, 4.5],
      [projectIds[9], 'Workout logging interface', 'Form for logging sets, reps, and weights', 'in_progress', 'medium', '2026-04-14', 4, null],
      [projectIds[10], 'Kitchen display system', 'Real-time order display for kitchen staff', 'todo', 'medium', '2026-04-25', 6, null],
      [projectIds[12], 'Model performance alerting', 'Automated alerts when model accuracy drops', 'in_progress', 'high', '2026-04-11', 5, null],
      [projectIds[14], 'Design token documentation', 'Document all design tokens and usage', 'todo', 'low', '2026-04-30', 3, null],
      [projectIds[15], 'Barcode scanner integration', 'Camera-based barcode scanning for mobile', 'todo', 'medium', '2026-04-20', 4, null],
    ];
    for (const t of tasksData) {
      await pool.query('INSERT INTO tasks (user_id, project_id, title, description, status, priority, due_date, estimated_hours, actual_hours) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [userId, ...t]);
    }

    // Seed Communications (16)
    const commsData = [
      [clientIds[0], projectIds[0], 'Website Redesign - Progress Update', 'Hi Sarah, I wanted to update you on the website redesign progress. We have completed the homepage and navigation components. The design system is also finalized. Next week we will focus on the product pages and CMS integration. Let me know if you have any questions.', 'email', 'outbound', '2026-04-07'],
      [clientIds[0], projectIds[0], 'Re: Website Redesign - Progress Update', 'Thanks Alex! The homepage looks fantastic. Can we schedule a call to discuss the product page layouts? I have some ideas about the filter functionality. Available Thursday afternoon.', 'email', 'inbound', '2026-04-07'],
      [clientIds[2], projectIds[2], 'Dashboard Performance Discussion', 'Lisa, I noticed some latency issues with the real-time data feeds. I am investigating optimization options including WebSocket connection pooling and data caching. Will have a solution by end of week.', 'email', 'outbound', '2026-04-08'],
      [clientIds[4], projectIds[4], 'Payment Integration Testing', 'Emma, the Stripe integration is complete and in testing. Could you provide test card details for your Stripe account? We need to verify webhook handling with your specific configuration.', 'email', 'outbound', '2026-04-06'],
      [clientIds[4], projectIds[4], 'Re: Payment Integration Testing', 'Hi Alex, great news! I have sent the test credentials to your encrypted email. Also, we need to discuss adding Apple Pay support - the board is requesting it. Can we add this to scope?', 'email', 'inbound', '2026-04-06'],
      [clientIds[5], projectIds[5], 'HIPAA Compliance Review - Call Notes', 'Call with Dr. Chen. Discussed HIPAA requirements for the patient portal. Key decisions: all PHI must be encrypted at rest and in transit, audit logs must be retained for 6 years, and BAA must be signed before go-live.', 'call', 'outbound', '2026-04-05'],
      [clientIds[7], projectIds[7], 'LMS Video Player Demo', 'Anna, the video player prototype is ready for review. I have set up a staging environment at staging.pinnacle-lms.com. Key features: adaptive streaming, progress tracking, bookmarks, and playback speed control.', 'email', 'outbound', '2026-04-08'],
      [clientIds[12], projectIds[12], 'ML Dashboard - Model Metrics Discussion', 'Team at Nexus, following up on our meeting about the model metrics dashboard. We agreed on tracking: accuracy, precision, recall, F1 score, and inference latency. The alerting system will use configurable thresholds.', 'meeting', 'outbound', '2026-04-04'],
      [clientIds[9], projectIds[9], 'Fitness App Feature Request', 'Hey Alex, our users have been requesting social features - workout sharing and leaderboards. Would it be possible to add these to the current sprint? Budget is flexible for the right features.', 'email', 'inbound', '2026-04-07'],
      [clientIds[1], projectIds[1], 'Portfolio Platform - Design Review', 'Mark, attached are the mockups for the portfolio gallery view. The lightbox uses lazy-loaded high-res images. Let me know your thoughts on the grid layout vs masonry approach.', 'email', 'outbound', '2026-04-03'],
      [clientIds[6], null, 'Project Pause Discussion', 'Tom, following up on our call about pausing the Atlas tracking project. I understand the budget constraints. The project is at a good stopping point - the core tracking is functional. We can resume whenever you are ready.', 'email', 'outbound', '2026-03-28'],
      [clientIds[10], projectIds[10], 'Kitchen Display System Specs', 'Chef, here are the specifications for the kitchen display. It will show orders in real-time with color-coded priority. Sound alerts for new orders. Touch interface for marking items complete.', 'email', 'outbound', '2026-04-08'],
      [clientIds[3], null, 'Project Completion & Handoff', 'James, the BlueSky campaign tracker is complete and deployed. All documentation is in the shared drive. The 30-day warranty period started December 15. Reach out if you need anything.', 'email', 'outbound', '2025-12-20'],
      [clientIds[8], projectIds[14], 'Brand Refresh Status', 'Dev team at Crimson, the design system tokens are defined and the component library is taking shape. We should schedule a review session next week to align on the final brand direction.', 'email', 'outbound', '2026-04-06'],
      [clientIds[15], projectIds[15], 'Inventory System Kickoff Notes', 'Ops team at Forge, great kickoff meeting today. Key takeaways: priority on barcode scanning, need offline mode for warehouse use, integration with existing ERP via API.', 'meeting', 'outbound', '2026-03-20'],
      [clientIds[11], null, 'Proposal Follow-up', 'Hi, following up on the Horizon Property Listing website proposal I sent last week. Happy to schedule a call to discuss the virtual tour integration in more detail. We could also explore a phased approach if the full scope budget is a concern.', 'email', 'outbound', '2026-04-01'],
    ];
    for (const cm of commsData) {
      await pool.query('INSERT INTO communications (user_id, client_id, project_id, subject, body, type, direction, date) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [userId, ...cm]);
    }

    // Seed Revenue Reports (16)
    const reportsData = [
      ['monthly', '2025-05-01', '2025-05-31', 8500, 1200, 7300, 3, 2],
      ['monthly', '2025-06-01', '2025-06-30', 11200, 1800, 9400, 4, 3],
      ['monthly', '2025-07-01', '2025-07-31', 9800, 1500, 8300, 3, 3],
      ['monthly', '2025-08-01', '2025-08-31', 13500, 2100, 11400, 5, 4],
      ['monthly', '2025-09-01', '2025-09-30', 15200, 1900, 13300, 5, 4],
      ['monthly', '2025-10-01', '2025-10-31', 12800, 2400, 10400, 4, 5],
      ['monthly', '2025-11-01', '2025-11-30', 18500, 2200, 16300, 6, 5],
      ['monthly', '2025-12-01', '2025-12-31', 20100, 3100, 17000, 7, 6],
      ['monthly', '2026-01-01', '2026-01-31', 16500, 4800, 11700, 5, 7],
      ['monthly', '2026-02-01', '2026-02-28', 14200, 2100, 12100, 5, 8],
      ['monthly', '2026-03-01', '2026-03-31', 19800, 2800, 17000, 6, 9],
      ['quarterly', '2025-07-01', '2025-09-30', 38500, 5400, 33100, 13, 4],
      ['quarterly', '2025-10-01', '2025-12-31', 51400, 7700, 43700, 17, 6],
      ['quarterly', '2026-01-01', '2026-03-31', 50500, 9700, 40800, 16, 9],
      ['annual', '2025-01-01', '2025-12-31', 156000, 28000, 128000, 52, 12],
      ['monthly', '2026-04-01', '2026-04-10', 7500, 900, 6600, 2, 10],
    ];
    for (const r of reportsData) {
      await pool.query('INSERT INTO revenue_reports (user_id, report_type, period_start, period_end, total_revenue, total_expenses, net_profit, invoices_count, projects_count) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
        [userId, ...r]);
    }

    // Seed Goals (16)
    const goalsData = [
      ['Reach $200K Annual Revenue', 'Grow annual revenue to $200K through new clients and higher rates', 'revenue', 200000, 156000, 'dollars', '2026-01-01', '2026-12-31', 'active'],
      ['Acquire 5 New Clients in Q2', 'Expand client base with 5 new clients in Q2 2026', 'clients', 5, 2, 'count', '2026-04-01', '2026-06-30', 'active'],
      ['Complete React Native Certification', 'Get certified in React Native to expand mobile development services', 'skills', 100, 65, 'percent', '2026-01-01', '2026-06-30', 'active'],
      ['Build Emergency Fund to $20K', 'Save $20K for 3-month business emergency fund', 'savings', 20000, 12500, 'dollars', '2025-07-01', '2026-06-30', 'active'],
      ['Launch Personal SaaS Product', 'Build and launch a micro-SaaS for freelancers', 'projects', 100, 25, 'percent', '2026-01-01', '2026-12-31', 'active'],
      ['Increase Average Hourly Rate to $175', 'Gradually increase rates across all clients', 'revenue', 175, 148, 'dollars', '2026-01-01', '2026-12-31', 'active'],
      ['Publish 12 Technical Blog Posts', 'Write monthly blog posts to build authority', 'skills', 12, 4, 'count', '2026-01-01', '2026-12-31', 'active'],
      ['Reduce Project Overrun Rate to <10%', 'Improve estimation accuracy and project management', 'projects', 10, 18, 'percent', '2026-01-01', '2026-12-31', 'active'],
      ['Network at 4 Industry Events', 'Attend conferences and meetups for business development', 'clients', 4, 1, 'count', '2026-01-01', '2026-12-31', 'active'],
      ['Automate 50% of Admin Tasks', 'Set up tools and workflows to reduce admin overhead', 'projects', 50, 30, 'percent', '2026-01-01', '2026-06-30', 'active'],
      ['Client Satisfaction Score >4.8/5', 'Maintain excellent client satisfaction ratings', 'clients', 4.8, 4.6, 'score', '2026-01-01', '2026-12-31', 'active'],
      ['Save $5K for New Equipment', 'Budget for workstation upgrade and accessories', 'savings', 5000, 3200, 'dollars', '2026-01-01', '2026-09-30', 'active'],
      ['Complete AWS Solutions Architect Cert', 'Get AWS certified for cloud project opportunities', 'skills', 100, 40, 'percent', '2026-03-01', '2026-08-31', 'active'],
      ['Reduce Invoicing Turnaround to 24hrs', 'Send invoices within 24 hours of milestone completion', 'projects', 24, 48, 'hours', '2026-01-01', '2026-06-30', 'active'],
      ['Build Referral Program', 'Create and launch a formal client referral program', 'clients', 100, 60, 'percent', '2026-02-01', '2026-05-31', 'active'],
      ['Achieve 90% Billable Utilization', 'Maximize billable hours as percentage of total work hours', 'revenue', 90, 78, 'percent', '2026-01-01', '2026-12-31', 'active'],
    ];
    for (const g of goalsData) {
      await pool.query('INSERT INTO goals (user_id, title, description, category, target_value, current_value, unit, start_date, target_date, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [userId, ...g]);
    }

    console.log('  Database seeded successfully!');
    console.log(`  Demo user: ${process.env.DEMO_EMAIL || 'demo@freelancer.com'}`);
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}

seed();
