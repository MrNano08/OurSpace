import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DataSource } from 'typeorm';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { readConfig } from './common/config';
async function main(){
  const c=readConfig();const app=await NestFactory.create<NestExpressApplication>(AppModule.register(c),{bodyParser:false});
  app.set('trust proxy','loopback');app.disable('x-powered-by');app.setGlobalPrefix('api');
  app.use(helmet());app.use(express.json({limit:'32kb'}));app.use(cookieParser());
  app.use((_req:express.Request,res:express.Response,next:express.NextFunction)=>{res.setHeader('Cache-Control','no-store');next();});
  app.enableCors({origin:c.WEB_ORIGIN,credentials:true});app.enableShutdownHooks();
  const db=app.get(DataSource);if(await db.showMigrations())throw new Error('Hay migraciones pendientes. Ejecuta npm run db:migrate antes de iniciar.');
  await app.listen(c.PORT,c.HOST);
}
void main().catch(()=>{console.error('No se pudo iniciar. Revisa .env, conectividad de MariaDB y migraciones pendientes.');process.exit(1);});
