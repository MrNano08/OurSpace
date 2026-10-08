import 'reflect-metadata';
import { Together1791420000000 } from '../src/database/migrations/1791420000000-together';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DataSource } from 'typeorm';
import { nextOccurrence,occurrenceAt,occurrencesBetween } from '../src/agenda/recurrence';
import { Initial1791410400000 } from '../src/database/migrations/1791410400000-initial';
import { Agenda1791414000000 } from '../src/database/migrations/1791414000000-agenda';
import { entities,Task,User } from '../src/database/entities';

test('Repetición mensual conserva el día 31 y la hora de Costa Rica, incluso al saltar años',()=>{
  const anchor=Date.parse('2026-01-31T23:30:00-06:00');
  assert.equal(occurrenceAt(anchor,'monthly',1),Date.parse('2026-02-28T23:30:00-06:00'));
  assert.equal(occurrenceAt(anchor,'monthly',2),Date.parse('2026-03-31T23:30:00-06:00'));
  assert.equal(nextOccurrence(anchor,'monthly',Date.parse('2030-02-01T00:00:00-06:00')),Date.parse('2030-02-28T23:30:00-06:00'));
});
test('Repetición anual del 29 de febrero vuelve al día 29 en el siguiente año bisiesto',()=>{
  const anchor=Date.parse('2028-02-29T12:00:00-06:00');
  assert.equal(occurrenceAt(anchor,'yearly',1),Date.parse('2029-02-28T12:00:00-06:00'));
  assert.equal(occurrenceAt(anchor,'yearly',4),Date.parse('2032-02-29T12:00:00-06:00'));
});
test('El límite de recurrencia es inclusivo y las consultas no generan todas las fechas históricas',()=>{
  const anchor=Date.parse('2026-10-07T09:00:00-06:00'),day=86400000;
  assert.deepEqual(occurrencesBetween(anchor,'daily',anchor,anchor+10*day,anchor+2*day),[anchor,anchor+day,anchor+2*day]);
  assert.equal(nextOccurrence(anchor,'weekly',anchor+1),anchor+7*day);
  assert.equal(nextOccurrence(anchor,'none',anchor+1),null);
  assert.equal(occurrencesBetween(anchor,'daily',anchor+10000*day,anchor+10003*day).length,3);
});
test('La migración incremental conserva usuarios y tareas de v0.1.0 y se puede reanudar',async()=>{
  const db=await new DataSource({type:'sqljs',entities,synchronize:false,migrations:[Initial1791410400000]}).initialize();
  try{
    await db.runMigrations();
    await db.query("INSERT INTO users (id,slug,name,email,passwordHash,mustChangePassword,accent,failedLogins,lockedUntil,createdAt) VALUES ('legacy-user','ronaldo','Ronaldo','test@example.test','existing-hash',0,'sage',0,0,1)");
    await db.query("INSERT INTO tasks (id,ownerId,title,notes,priority,dueAt,completed,dueNotified,createdAt,updatedAt) VALUES ('legacy-task','legacy-user','Conservar mi tarea','Nota original',3,1900000000000,0,0,1,1)");
    const runner=db.createQueryRunner();const migration=new Agenda1791414000000();await migration.up(runner);await migration.up(runner);
    const task=await db.getRepository(Task).findOneByOrFail({id:'legacy-task'});assert.equal(task.title,'Conservar mi tarea');assert.equal(task.notes,'Nota original');assert.equal(task.recurrence,'none');assert.equal(task.email,false);assert.equal(task.nextTaskId,null);
    assert.equal((await db.query("SELECT passwordHash FROM users WHERE id = 'legacy-user'"))[0].passwordHash,'existing-hash');await runner.release();
  }finally{await db.destroy();}
});


test('Migración 0.3.0 conserva datos de 0.2.0 y se reanuda sin duplicar tablas o índices',async()=>{
  const db=await new DataSource({type:'sqljs',entities,synchronize:false,migrations:[Initial1791410400000,Agenda1791414000000]}).initialize();
  try{
    await db.runMigrations();
    await db.query("INSERT INTO users (id,slug,name,email,passwordHash,mustChangePassword,accent,failedLogins,lockedUntil,createdAt) VALUES ('existing-user','ronaldo','Ronaldo','existing@example.test','preserve-hash',0,'sage',0,0,1)");
    await db.query("INSERT INTO tasks (id,ownerId,title,notes,priority,dueAt,completed,dueNotified,recurrence,email,createdAt,updatedAt) VALUES ('existing-task','existing-user','Mi tarea semanal','Nota',2,1900000000000,0,0,'weekly',1,1,1)");
    const before=await db.query('SELECT * FROM tasks');
    const runner=db.createQueryRunner(),migration=new Together1791420000000();await migration.up(runner);await migration.up(runner);
    assert.deepEqual(await db.query('SELECT * FROM tasks'),before);assert.equal((await db.query("SELECT passwordHash FROM users WHERE id = 'existing-user'"))[0].passwordHash,'preserve-hash');
    for(const table of ['messages','petitions']){
      const t=await runner.getTable(table);assert.ok(t);assert.equal(t.foreignKeys.length,2);assert.equal(new Set(t.indices.map(i=>i.name)).size,t.indices.length);
    }
    await runner.release();
  }finally{await db.destroy();}
});
