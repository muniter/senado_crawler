SELECT numero,
       numeroCamara,
       titulo,
       estado,
       estadoAnotacion,
       fechaDePresentacion,
       legislatura,
       url,
       origen,
       acumulados,
       autores,
       ponentesPrimerDebate
FROM ProyectosActoLegislativoSenado
         LEFT JOIN Legislatura ON Legislatura.title = ProyectosActoLegislativoSenado.legislatura
         LEFT JOIN Cuatrenio ON Cuatrenio.id = Legislatura.cuatrenioId
WHERE Cuatrenio.title = :cuatrenio_title
ORDER BY legislatura, numero;
