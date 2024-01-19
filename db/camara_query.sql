SELECT numeroCamara,
       numeroSenado,
       tituloCorto,
       tipo,
       autores,
       estado,
       comision,
       origen,
       Cuatrenio.title AS cuatrenio,
       legislatura,
       url,
       tituloLargo,
       objeto
FROM CamaraProyectos
LEFT JOIN Legislatura ON legislatura.title = legislatura
LEFT JOIN Cuatrenio ON cuatrenio.id = legislatura.cuatrenioId
WHERE Cuatrenio.title = :cuatrenio_title
