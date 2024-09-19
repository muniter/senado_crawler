SELECT numero_camara AS "numeroCamara",
       numero_senado AS "numeroSenado",
       titulo_corto AS "tituloCorto",
       tipo,
       autores,
       estado,
       comision,
       origen,
       cuatrenio.title AS "cuatrenio",
       legislatura,
       url,
       titulo_largo AS "tituloLargo",
       objeto
FROM camara
         LEFT JOIN legislatura ON legislatura.title = legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenio_id
WHERE cuatrenio.title = :cuatrenio_title
