import { Videos1791450000000 } from './migrations/1791450000000-videos';
import 'reflect-metadata';
import { DataSource,EntityManager,EntityTarget,ObjectLiteral } from 'typeorm';
import { Config } from '../common/config';
import { entities } from './entities';
import { Initial1791410400000 } from './migrations/1791410400000-initial';
import { Agenda1791414000000 } from './migrations/1791414000000-agenda';
import { Together1791420000000 } from './migrations/1791420000000-together';
import { Gallery1791430000000 } from './migrations/1791430000000-gallery';
import { Finishing1791440000000 } from './migrations/1791440000000-finishing';
export const migrations=[Initial1791410400000,Agenda1791414000000,Together1791420000000,Gallery1791430000000,Finishing1791440000000,Videos1791450000000];
export function createDataSource(c:Config) {return new DataSource({type:'mariadb',host:c.DB_HOST,port:c.DB_PORT,username:c.DB_USERNAME,password:c.DB_PASSWORD,database:c.DB_DATABASE,charset:'utf8mb4',timezone:'Z',entities,migrations,synchronize:false,logging:false,extra:{connectionLimit:5},migrationsTransactionMode:'each'});}
// MariaDB uses row locks; SQL.js is restricted to automated tests.
export function locked<T extends ObjectLiteral>(em:EntityManager,target:EntityTarget<T>,alias:string){const q=em.getRepository(target).createQueryBuilder(alias);return em.connection.options.type==='sqljs'?q:q.setLock('pessimistic_write');}
