SELECT numeroCamara,
       numeroSenado,
       tituloCorto,
       tipo,
       autores,
       estado,
       comision,
       origen,
       cuatrenio.title AS cuatrenio,
       legislatura,
       url,
       tituloLargo,
       objeto
FROM camara
         LEFT JOIN legislatura ON legislatura.title = legislatura
         LEFT JOIN cuatrenio ON cuatrenio.id = legislatura.cuatrenioId
WHERE cuatrenio.title = :cuatrenio_title
