import { Injectable,Inject,ServiceUnavailableException } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { CONFIG,Config } from '../common/config';
@Injectable()
export class MailService {
  constructor(@Inject(CONFIG)private readonly c:Config){}
  available(){return Boolean(this.c.MAIL_USER&&this.c.MAIL_APP_PASSWORD);}
  async sendReset(to:string,code:string){
    return this.sendNotice(to,'Tu código · Nuestro espacio',`Tu código de recuperación es ${code}. Vence en 10 minutos y solo se puede utilizar una vez. Si no lo solicitaste, ignora este correo.`);
  }
  async sendNotice(to:string,subject:string,text:string,id?:string){
    if(!this.available())throw new ServiceUnavailableException('La recuperación por correo aún no está configurada. Usa el script de emergencia del servidor.');
    const transport=nodemailer.createTransport({host:'smtp.gmail.com',port:465,secure:true,auth:{user:this.c.MAIL_USER,pass:this.c.MAIL_APP_PASSWORD},connectionTimeout:10000,socketTimeout:15000});
    try{await transport.sendMail({from:this.c.MAIL_FROM||this.c.MAIL_USER,to,subject,text,...(id?{messageId:`<${id}@nuestro-espacio.local>`}:{})});}
    catch{throw new ServiceUnavailableException('No se pudo enviar el correo. Inténtalo más tarde o usa el script de emergencia.');}
    finally{transport.close();}
  }
}
