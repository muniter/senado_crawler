SELECT numero,
       numeroCamara,
       titulo,
       estado,
       origen,
       acumulados,
       legislatura,
       url,
       fechaDePresentacion,
       autores,
       ponentesPrimerDebate
FROM ProyectosActoLegislativoSenado
         LEFT JOIN Legislatura ON Legislatura.title = ProyectosActoLegislativoSenado.legislatura
         LEFT JOIN Cuatrenio ON Cuatrenio.id = Legislatura.cuatrenioId
WHERE Cuatrenio.title = :cuatrenio_title
ORDER BY legislatura, numero;
