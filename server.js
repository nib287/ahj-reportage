const http = require('http');
const Koa = require('koa');
const app = new Koa();
const koaBody = require('koa-body');
const uuid = require('uuid')
const port = process.env.PORT || 8080;
const {streamEvents} = require('http-event-stream');

app.use(async(ctx, next) => {
    const origin = ctx.request.get('Origin');
    if(!origin) {
        return await next();
    }
    
    const headers = {'Access-Control-Allow-Origin': '*',}
    
    if(ctx.request.method !== 'OPTIONS') {
        ctx.response.set({...headers});
        try {
            return await next();
        }catch(e) {
            e.headers = {...e.headers,...headers};
            throw e;
        }
    }
    
    if(ctx.request.get('Access-Control-Request-Method')) {
        ctx.response.set({
        ...headers,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });
        
    if(ctx.request.get('Access-Control-Request-Headers')) {
        ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Allow-Request-Headers'));
    }
        
    ctx.response.status = 204;
    }
});

app.use(koaBody({
    text: true,
    urlencoded: true,
    multipart: true,
    json: true
}));

const getDate = () => {
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        timezone: 'UTC',
        hour: 'numeric',
        minute: 'numeric',
    };
    
    return  new Date().toLocaleString("ru", options);
}

const messageList = []
let quantityMesseges = 0;
let currentMessage = null;
let currentDate = null;

const interval = setInterval(() => {
    const getRandomeMessage = () => {
        let randomNumber = Math.random() 
        if (randomNumber < 0.5) {
            return {
                value: 'Идёт перемещение мяча по полю, игроки и той, и другой команды активно пытаются атаковать',
                type: 'action'
            };
        } else if (randomNumber < 0.9) {
            return {
                value: 'Нарушение правил, будет штрафной удар',
                type: 'freekick'
            };
        } else   {
            return {
                value: 'Отличный удар! И Г-О-Л!',
                type: 'goal'
            };
        }                  
    }

    currentDate = getDate();
    currentMessage = getRandomeMessage();
    messageList.push({
        date: currentDate, 
        value: currentMessage.value, 
        type: currentMessage.type
    });

    quantityMesseges++
    
    if(quantityMesseges === 50)  {
        clearInterval(interval);
    }

}, 3000);

const Router = require('koa-router');
const router = new Router();

router.get('/sse', async(ctx) => { 
    streamEvents(ctx.req, ctx.res,{
        // как использовать fetch чтобы передать непрочитанные сообщения?
        async fetch() {
            return [];
        },
        stream(sse) {
            sse.sendEvent({
                data: JSON.stringify(messageList),
                id: uuid.v4(),
                event: 'unreadMessages'
            });
            
            const interval = setInterval(() => {
                sse.sendEvent({
                    data: JSON.stringify({
                        date: currentDate, 
                        value: currentMessage.value, 
                        type: currentMessage.type
                    }),
                    id: uuid.v4(),
                    event: 'message'
                });

                if(quantityMesseges === 50)  clearInterval(interval);
            }, 3000);  
            
            return () => clearInterval(interval);
        }
    });
        
    ctx.respond = false;
});
    
app.use(router.routes()).use(router.allowedMethods());

http.createServer(app.callback()).listen(port);



