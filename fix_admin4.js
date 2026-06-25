const fs = require('fs');

let contenido = fs.readFileSync('app/admin/page.js', 'utf8');

contenido = contenido
  .replace(
    "setNombreEquipo(eq.nombre); setOrgIdEquipo(eq.orgId); setSupervisorIdEquipo(eq.supervisorId || '');",
    "setNombreEquipo(eq.nombre || ''); setOrgIdEquipo(eq.orgId || ''); setSupervisorIdEquipo(eq.supervisorId || '');"
  )
  .replace(
    "setNombreCargo(cargo.nombre); setNivelCargo(cargo.nivel); setOrgIdCargo(cargo.orgId);",
    "setNombreCargo(cargo.nombre || ''); setNivelCargo(cargo.nivel || 'operativo'); setOrgIdCargo(cargo.orgId || '');"
  )
  .replace(
    "setNombreOrg(org.nombre); setEditandoOrgId(org.id);",
    "setNombreOrg(org.nombre || ''); setEditandoOrgId(org.id);"
  )
  .replace(
    "setNombreProyecto(p.nombre);",
    "setNombreProyecto(p.nombre || '');"
  )
  .replace(
    "setDescripcionProyecto(p.descripcion || '');",
    "setDescripcionProyecto(p.descripcion || '');"
  );

fs.writeFileSync('app/admin/page.js', contenido, 'utf8');
console.log('Fix aplicado. Líneas:', contenido.split('\n').length);