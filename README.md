# Senado Crawler

# Instalar

Dependencias:

1. Node.js 16 o Node.js 18
2. Sqlite

## Pasos

1. Instalar dependencias

```bash
npm install
```

2. Inicializar datos

```bash
npm run clean
```

3. Actualizar datos del listado de un periodo

```
npm run refresh -- --cuatrenio "2022-2026" --legislatura "2022-2023" --tipo lista
```

4. Actualizar detalles de los proyectos de un periodo.

```
npm run refresh -- --cuatrenio "2022-2026" --legislatura "2022-2023" --tipo detalle
```

5. Revisar los resultados.

Los resultados de la ejecución se guardan en la carpeta `prisma` en el archivo `dev.db`. Esto es una base de datos en formato Sqlite que se puede visualizar en diferentes programas como https://sqlitebrowser.org/dl/


## Tareas

- Crawl main page
  - Extract basic information
    - Put in a database table `proyectos`
    - Crawl details for each
    - Put in a database table `proyectos_detail`
- Sync periodically from db to google sheets, db is source of truth for scraped data.
