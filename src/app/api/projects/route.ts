import { NextRequest, NextResponse } from 'next/server';
import { getDb, Project, ProjectPeriod } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id'); // Query for specific project
  
  const db = getDb();
  
  if (id) {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(parseInt(id));
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const periods = db.prepare('SELECT * FROM project_periods WHERE project_id = ? ORDER BY period_number').all(project.id);
    return NextResponse.json({ ...project, periods });
  }
  
  const projects = db.prepare('SELECT * FROM projects ORDER BY name').all();
  
  // Get periods for each project
  const projectsWithPeriods = projects.map((project: any) => {
    const periods = db.prepare('SELECT * FROM project_periods WHERE project_id = ? ORDER BY period_number').all(project.id);
    return { ...project, periods };
  });
  
  return NextResponse.json(projectsWithPeriods);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  const result = db.prepare(`
    INSERT INTO projects (name, code, start_date) VALUES (?, ?, ?)
  `).run(body.name, body.code, body.start_date);
  
  // Add initial periods if provided
  if (body.periods && body.periods.length > 0) {
    for (const period of body.periods) {
      db.prepare(`
        INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)
      `).run(result.lastInsertRowid, period.period_number, period.start_date, period.end_date, period.description);
    }
  }
  
  return NextResponse.json({ id: result.lastInsertRowid, ...body });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const body = await request.json();
  const db = getDb();
  
  // Check if project exists
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(parseInt(id));
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Update project
  db.prepare(`
    UPDATE projects 
    SET name = ?, code = ?, start_date = ?
    WHERE id = ?
  `).run(body.name, body.code, body.start_date, parseInt(id));
  
  // Delete existing periods
  db.prepare('DELETE FROM project_periods WHERE project_id = ?').run(parseInt(id));
  
  // Add new periods
  if (body.periods && body.periods.length > 0) {
    for (const period of body.periods) {
      db.prepare(`
        INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)
      `).run(parseInt(id), period.period_number, period.start_date, period.end_date, period.description);
    }
  }
  
  return NextResponse.json({ id: parseInt(id), ...body });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const db = getDb();
  
  // Check if project exists
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(parseInt(id));
  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  // Delete related entries and payments first (foreign key constraints)
  db.prepare('DELETE FROM monthly_entries WHERE 1=0'); // We'll implement this properly later if needed
  db.prepare('DELETE FROM payments WHERE 1=0'); // We'll implement this properly later if needed
  
  // Delete periods
  db.prepare('DELETE FROM project_periods WHERE project_id = ?').run(parseInt(id));
  
  // Now delete the project
  db.prepare('DELETE FROM projects WHERE id = ?').run(parseInt(id));
  
  return NextResponse.json({ success: true, deletedId: parseInt(id) });
}
