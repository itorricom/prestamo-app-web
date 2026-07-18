# Manual de despliegue — Préstamo App (VPS)

Guía para desplegar el backend (NestJS + PostgreSQL) y el frontend (React/Vite)
en un VPS básico de ~$5/mes (1 GB RAM, 1 vCPU, Ubuntu 22.04/24.04).
Proveedores típicos: DigitalOcean, Vultr, Hetzner, Contabo, Linode.

> **¿Por qué no hosting compartido?** El hosting compartido (cPanel) está pensado
> para PHP/MySQL: no permite procesos Node.js persistentes ni PostgreSQL.
> Esta app necesita ambos. El VPS de $5 es la opción correcta.

---

## 0. Resumen de la arquitectura

```
Internet
   │
   ▼
Nginx (puertos 80/443, SSL)
   ├── /            → frontend estático (dist/ de Vite)
   └── /api/        → proxy a NestJS en localhost:3000
                          │
                          ▼
                     PostgreSQL (localhost:5432)
```

---

## 1. Preparar el VPS

Conéctate por SSH con el usuario root que te da el proveedor:

```bash
ssh root@IP_DEL_VPS
```

Crea un usuario de trabajo y activa el firewall:

```bash
adduser deploy
usermod -aG sudo deploy

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

**Swap (obligatorio con 1 GB de RAM** — sin esto el build puede quedarse sin memoria):

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

A partir de aquí trabaja como el usuario `deploy`:

```bash
su - deploy
```

---

## 2. Instalar Node.js, PostgreSQL, Nginx y PM2

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL y Nginx
sudo apt-get install -y postgresql nginx git

# PM2 (mantiene el backend vivo y lo reinicia si se cae)
sudo npm install -g pm2
```

---

## 3. Crear la base de datos

```bash
sudo -u postgres psql
```

Dentro de psql (cambia la contraseña por una segura):

```sql
CREATE USER prestamo WITH PASSWORD 'CAMBIA_ESTA_CONTRASEÑA';
CREATE DATABASE prestamo_db OWNER prestamo;
\q
```

---

## 4. Desplegar el backend

```bash
cd ~
git clone <URL_DE_TU_REPO>/prestamo-app-nest.git
cd prestamo-app-nest
npm ci
```

Crea el archivo `.env` (usa `.env.example` como referencia):

```bash
nano .env
```

```ini
DATABASE_URL="postgresql://prestamo:CAMBIA_ESTA_CONTRASEÑA@localhost:5432/prestamo_db"
JWT_SECRET="genera-una-cadena-larga-y-aleatoria-aqui"
PORT=3000
```

> Genera un JWT_SECRET seguro con: `openssl rand -base64 48`

Migraciones, seed y build:

```bash
npx prisma generate
npx prisma migrate deploy   # si no hay migraciones versionadas: npx prisma db push
npm run db:seed             # crea el tenant y el usuario admin
npm run build
```

Arranca con PM2 y deja que sobreviva reinicios del servidor:

```bash
pm2 start dist/main.js --name prestamo-api
pm2 save
pm2 startup   # ejecuta el comando que te imprime
```

Verifica: `curl http://localhost:3000/` debe responder.

---

## 5. Desplegar el frontend

```bash
cd ~
git clone <URL_DE_TU_REPO>/prestamo-app-web.git
cd prestamo-app-web
npm ci
```

Configura la URL de la API (misma web, ruta `/api`):

```bash
echo 'VITE_API_URL=https://TU_DOMINIO.com/api' > .env.production
npm run build
```

Copia el build donde Nginx pueda servirlo:

```bash
sudo mkdir -p /var/www/prestamo
sudo cp -r dist/* /var/www/prestamo/
```

---

## 6. Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/prestamo
```

```nginx
server {
    listen 80;
    server_name TU_DOMINIO.com;

    # Frontend estático
    root /var/www/prestamo;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;   # necesario para React Router
    }

    # API — la barra final en proxy_pass elimina el prefijo /api
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Comprobantes subidos (solo si usas storage local)
    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
    }

    client_max_body_size 10M;   # subida de comprobantes
}
```

Activa el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/prestamo /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

---

## 7. SSL gratis (Let's Encrypt)

Apunta primero el dominio a la IP del VPS (registro A en tu DNS). Luego:

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d TU_DOMINIO.com
```

Certbot reescribe la config a HTTPS y renueva solo. Verifica: `sudo certbot renew --dry-run`.

---

## 8. Actualizar la app (cada vez que hagas cambios)

```bash
# Backend
cd ~/prestamo-app-nest
git pull
npm ci
npx prisma migrate deploy
npm run build
pm2 restart prestamo-api

# Frontend
cd ~/prestamo-app-web
git pull
npm ci
npm run build
sudo cp -r dist/* /var/www/prestamo/
```

---

## 9. Respaldos de la base de datos

Respaldo diario a las 2 AM (guarda 7 días):

```bash
mkdir -p ~/backups
crontab -e
```

Agrega:

```cron
0 2 * * * pg_dump "postgresql://prestamo:CAMBIA_ESTA_CONTRASEÑA@localhost:5432/prestamo_db" | gzip > ~/backups/prestamo_$(date +\%F).sql.gz && find ~/backups -mtime +7 -delete
```

Restaurar: `gunzip -c archivo.sql.gz | psql "postgresql://..."`.

> Idealmente copia los respaldos fuera del VPS (rclone a Google Drive/S3).

---

## 10. Comandos útiles de operación

| Qué | Comando |
|---|---|
| Logs del backend en vivo | `pm2 logs prestamo-api` |
| Estado de procesos | `pm2 status` |
| Reiniciar backend | `pm2 restart prestamo-api` |
| Logs de Nginx | `sudo tail -f /var/log/nginx/error.log` |
| Uso de memoria/CPU | `htop` (instala con `sudo apt install htop`) |
| Espacio en disco | `df -h` |

---

## Checklist final

- [ ] `https://TU_DOMINIO.com` carga el login
- [ ] Login funciona (la petición va a `/api/auth/login`)
- [ ] `pm2 status` muestra `prestamo-api` online
- [ ] `pm2 save` + `pm2 startup` ejecutados (sobrevive reinicios)
- [ ] SSL activo y renovación automática verificada
- [ ] Swap activo (`free -h` muestra 2 GB de swap)
- [ ] Cron de respaldo configurado
- [ ] Contraseña del seed cambiada (¡`admin123` no puede llegar a producción!)

---

## Alternativa sin VPS (opcional)

Si algún día prefieres no administrar servidor, la combinación gratuita/barata típica:

| Pieza | Servicio |
|---|---|
| Frontend | Vercel o Netlify (gratis) |
| Backend | Render o Railway (~$5-7/mes el plan sin suspensión) |
| PostgreSQL | Neon o Supabase (gratis hasta cierto uso) |

Menos control y la BD queda fuera de tu país, pero cero mantenimiento.
