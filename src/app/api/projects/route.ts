import { NextRequest, NextResponse } from 'next/server';
import { getDb, query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  const db = getDb();
  
  if (id) {
    const result = await db.query('SELECT * FROM projects WHERE id = $1', [parseInt(id)]);
    if (result.length === 0) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    
    const project = result[0];
    const periods = await db.query('SELECT * FROM project_periods WHERE project_id = $1 ORDER BY period_number', [project.id]);
    return NextResponse.json({ ...project, periods });
  }
  
  const projects = await db.query('SELECT * FROM projects ORDER BY name');
  
  // Get periods for each project
  const projectsWithPeriods = await Promise.all(projects.map(async (project: any) => {
    const periods = await db.query('SELECT * FROM project_periods WHERE project_id = $1 ORDER BY period_number', [project.id]);
    return { ...project, periods };
  }));
  
  return NextResponse.json(projectsWithPeriods);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const db = getDb();
  
  const result = await db.query(
    `INSERT INTO projects (name, code, start_date) VALUES ($1, $2, $3) RETURNING id`,
    [body.name, body.code, body.start_date]
  );
  
  const projectId = result[0]?.id;
  
  if (body.periods && body.periods.length > 0) {
    for (const period of body.periods) {
      await db.query(
        `INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5)`,
        [projectId, period.period_number, period.start_date, period.end_date, period.description]
      );
    }
  }
  
  return NextResponse.json({ id: projectId, ...body });
}

export async function PUT(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  
  if (!id) {
    return NextResponse.json({ error: 'ID parameter required' }, { status: 400 });
  }
  
  const body = await request.json();
  const db = getDb();
  
  const existing = await db.query('SELECT * FROM projects WHERE id = $1', [parseInt(id)]);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  await db.query(
    `UPDATE projects SET name = $1, code = $2, start_date = $3 WHERE id = $4`,
    [body.name, body.code, body.start_date, parseInt(id)]
  );
  
  await db.query('DELETE FROM project_periods WHERE project_id = $1', [parseInt(id)]);
  
  if (body.periods && body.periods.length > 0) {
    for (const period of body.periods) {
      await db.query(
        `INSERT INTO project_periods (project_id, period_number, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5)`,
        [parseInt(id), period.period_number, period.start_date, period.end_date, period.description]
      );
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
  
  const existing = await db.query('SELECT * FROM projects WHERE id = $1', [parseInt(id)]);
  if (existing.length === 0) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }
  
  await db.query('DELETE FROM project_periods WHERE project_id = $1', [parseInt(id)]);
  await db.query('DELETE FROM projects WHERE id = $1', [parseInt(id)]);
  
  return NextResponse.json({ success: true, deletedId: parseInt(id) });
}
