// fix_admin.js
const fs = require('fs');

const content = `'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  orderBy,
  query,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';

const NIVELES = ['operativo', 'tactico', 'estrategico'];
const generarId = () => Math.random().toString(36).slice(2, 10);

export default function AdminPage() {
  const router = useRouter();
  const { usuario, cargando } = useAuth();

  const [tab, setTab] = useState('organizaciones');

  const [organizaciones, setOrganizaciones] = useState([]);
  const [equipos, setEquipos] = useState([]);
  const [cargos, setCargos] = useState([]);

  const [nombreOrg, setNombreOrg] = useState('');
  const [editandoOrgId, setEditandoOrgId] = useState(null);

  const [nombreEquipo, setNombreEquipo] = useState('');
  const [orgIdEquipo, setOrgIdEquipo] = useState('');
  const [supervisorIdEquipo, setSupervisorIdEquipo] = useState('');
  const [editandoEquipoId, setEditandoEquipoId] = useState(null);

  const [nombreCargo, setNombreCargo] = useState('');
  const [nivelCargo, setNivelCargo] = useState('operativo');
  const [orgIdCargo, setOrgIdCargo] = useState('');
  const [tareas, setTareas] = useState([
    { id: generarId(), nombre: '', descripcion: '', criticidad: 'media', nivel: 'operativo' },
  ]);
  const [editandoCargoId, setEditandoCargoId] = useState(null);

  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!cargando && (!usuario || usuario.rol !== 'admin')) {
      router.push('/dashboard');
    }
  }, [cargando, usuario, router]);

  useEffect(() => {
    const unsubOrg = onSnapshot(
      query(collection(db, 'organizaciones'), orderBy('fechaCreacion', 'desc')),
      (snap) => setOrganizaciones(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubEquipos = onSnapshot(collection(db, 'equipos'), (snap) =>
      setEquipos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    const unsubCargos = onSnapshot(collection(db, 'cargos'), (snap) =>
      setCargos(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    return () => {
      unsubOrg();
      unsubEquipos();
      unsubCargos();
    };
  }, []);

  const limpiarFormularioOrg = () => {
    setNombreOrg('');
    setEditandoOrgId(null);
  };

  const iniciarEdicionOrg = (org) => {
    setNombreOrg(org.nombre);
    setEditandoOrgId(org.id);
    setMensaje('');
  };

  const guardarOrganizacion = async (e) => {
    e.preventDefault();
    if (!nombreOrg.trim()) {
      setMensaje('Falta el nombre de la organización.');
      return;
    }
    setGuardando(true);
    if (editandoOrgId) {
      await updateDoc(doc(db, 'organizaciones', editandoOrgId), { nombre: nombreOrg.trim() });
      setMensaje('Organización actualizada.');
    } else {
      await addDoc(collection(db, 'organizaciones'), {
        nombre: nombreOrg.trim(),
        fechaCreacion: serverTimestamp(),
      });
      setMensaje('Organización creada.');
    }
    limpiarFormularioOrg();
    setGuardando(false);
  };

  const limpiarFormularioEquipo = () => {
    setNombreEquipo('');
    setOrgIdEquipo('');
    setSupervisorIdEquipo('');
    setEditandoEquipoId(null);
  };

  const iniciarEdicionEquipo = (eq) => {
    setNombreEquipo(eq.nombre);
    setOrgIdEquipo(eq.orgId);
    setSupervisorIdEquipo(eq.supervisorId || '');
    setEditandoEquipoId(eq.id);
    setMensaje('');
  };

  const guardarEquipo = async (e) => {
    e.preventDefault();
    if (!nombreEquipo.trim() || !orgIdEquipo) {
      setMensaje('Falta el nombre del equipo o la organización.');
      return;
    }
    setGuardando(true);
    const datos = {
      nombre: nombreEquipo.trim(),
      orgId: orgIdEquipo,
      supervisorId: supervisorIdEquipo.trim() || null,
    };
    if (editandoEquipoId) {
      await updateDoc(doc(db, 'equipos', editandoEquipoId), datos);
      setMensaje('Equipo actualizado.');
    } else {
      await addDoc(collection(db, 'equipos'), datos);
      setMensaje('Equipo creado.');
    }
    limpiarFormularioEquipo();
    setGuardando(false);
  };

  const agregarFilaTarea = () => {
    setTareas([...tareas, { id: generarId(), nombre: '', descripcion: '', criticidad: 'media', nivel: 'operativo' }]);
  };

  const quitarFilaTarea = (index) => {
    setTareas(tareas.filter((_, i) => i !== index));
  };

  const actualizarTarea = (index, campo, valor) => {
    const copia = [...tareas];
    copia[index][campo] = valor;
    setTareas(copia);
  };

  const limpiarFormularioCargo = () => {
    setNombreCargo('');
    setNivelCargo('operativo');
    setOrgIdCargo('');
    setTareas([{ id: generarId(), nombre: '', descripcion: '', criticidad: 'media', nivel: 'operativo' }]);
    setEditandoCargoId(null);
  };

  const iniciarEdicionCargo = (cargo) => {
    setNombreCargo(cargo.nombre);
    setNivelCargo(cargo.nivel);
    setOrgIdCargo(cargo.orgId);
    setTareas(
      cargo.tareasCriticas && cargo.tareasCriticas.length > 0
        ? cargo.tareasCriticas.map((t) => ({ id: t.id || generarId(), ...t }))
        : [{ id: generarId(), nombre: '', descripcion: '', criticidad: 'media', nivel: 'operativo' }]
    );
    setEditandoCargoId(cargo.id);
    setMensaje('');
  };

  const guardarCargo = async (e) => {
    e.preventDefault();
    if (!nombreCargo.trim() || !orgIdCargo) {
      setMensaje('Falta el nombre del cargo o la organización.');
      return;
    }
    setGuardando(true);
    const datos = {
      nombre: nombreCargo.trim(),
      nivel: nivelCargo,
      orgId: orgIdCargo,
      tareasCriticas: tareas.filter((t) => t.nombre.trim() !== ''),
    };

    if (editandoCargoId) {
      await updateDoc(doc(db, 'cargos', editandoCargoId), datos);
      setMensaje('Cargo actualizado.');
    } else {
      await addDoc(collection(db, 'cargos'), { ...datos, fechaCreacion: serverTimestamp() });
      setMensaje('Cargo creado.');
    }

    limpiarFormularioCargo();
    setGuardando(false);
  };

  if (cargando || !usuario || usuario.rol !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-bold">Karbo Skills — Panel Admin</h1>
          <p className="text-xs text-gray-500">by elemental.</p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-md transition"
        >
          Volver al dashboard
        </button>
      </header>

      <div className="flex border-b border-gray-800 px-6">
        {['organizaciones', 'equipos', 'cargos'].map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setMensaje(''); }}
            className={\`px-4 py-3 text-sm capitalize border-b-2 transition \${
              tab === t ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'
            }\`}
          >
            {t}
          </button>
        ))}
      </div>

      <main className="p-6 max-w-3xl">
        {mensaje && <p className="text-sm text-teal-400 mb-4">{mensaje}</p>}

        {tab === 'organizaciones' && (
          <div>
            <form onSubmit={guardarOrganizacion} className="flex gap-2 mb-6">
              <input
                value={nombreOrg}
                onChange={(e) => setNombreOrg(e.target.value)}
                placeholder="Nombre de la organización"
                className="flex-1 bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <button
                disabled={guardando}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium"
              >
                {editandoOrgId ? 'Guardar' : 'Crear'}
              </button>
              {editandoOrgId && (
                <button
                  type="button"
                  onClick={limpiarFormularioOrg}
                  className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Cancelar
                </button>
              )}
            </form>
            <div className="space-y-2">
              {organizaciones.map((org) => (
                <div key={org.id} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3 flex items-center justify-between">
                  <div>
                    {org.nombre}
                    <span className="text-xs text-gray-500 ml-2">{org.id}</span>
                  </div>
                  <button onClick={() => iniciarEdicionOrg(org)} className="text-sm text-blue-400 hover:text-blue-300">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'equipos' && (
          <div>
            <form onSubmit={guardarEquipo} className="space-y-3 mb-6">
              <input
                value={nombreEquipo}
                onChange={(e) => setNombreEquipo(e.target.value)}
                placeholder="Nombre del equipo"
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <select
                value={orgIdEquipo}
                onChange={(e) => setOrgIdEquipo(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona organización</option>
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>{org.nombre}</option>
                ))}
              </select>
              <input
                value={supervisorIdEquipo}
                onChange={(e) => setSupervisorIdEquipo(e.target.value)}
                placeholder="UID del supervisor (opcional por ahora)"
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <button
                  disabled={guardando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium"
                >
                  {editandoEquipoId ? 'Guardar cambios' : 'Crear equipo'}
                </button>
                {editandoEquipoId && (
                  <button
                    type="button"
                    onClick={limpiarFormularioEquipo}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-2">
              {equipos.map((eq) => (
                <div key={eq.id} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3 flex items-center justify-between">
                  <div>
                    {eq.nombre}
                    <span className="text-xs text-gray-500 ml-2">org: {eq.orgId}</span>
                  </div>
                  <button onClick={() => iniciarEdicionEquipo(eq)} className="text-sm text-blue-400 hover:text-blue-300">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'cargos' && (
          <div>
            <form onSubmit={guardarCargo} className="space-y-3 mb-6">
              <input
                value={nombreCargo}
                onChange={(e) => setNombreCargo(e.target.value)}
                placeholder="Nombre del cargo"
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              />
              <select
                value={nivelCargo}
                onChange={(e) => setNivelCargo(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                {NIVELES.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <select
                value={orgIdCargo}
                onChange={(e) => setOrgIdCargo(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-md px-3 py-2 focus:outline-none focus:border-blue-500"
              >
                <option value="">Selecciona organización</option>
                {organizaciones.map((org) => (
                  <option key={org.id} value={org.id}>{org.nombre}</option>
                ))}
              </select>

              <div>
                <p className="text-sm text-gray-400 mb-2">Tareas críticas del cargo</p>
                {tareas.map((t, i) => (
                  <div key={t.id} className="grid grid-cols-12 gap-2 mb-2">
                    <input
                      value={t.nombre}
                      onChange={(e) => actualizarTarea(i, 'nombre', e.target.value)}
                      placeholder="Tarea"
                      className="col-span-4 bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-sm"
                    />
                    <input
                      value={t.descripcion}
                      onChange={(e) => actualizarTarea(i, 'descripcion', e.target.value)}
                      placeholder="Descripción"
                      className="col-span-4 bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-sm"
                    />
                    <select
                      value={t.criticidad}
                      onChange={(e) => actualizarTarea(i, 'criticidad', e.target.value)}
                      className="col-span-2 bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-sm"
                    >
                      <option value="alta">alta</option>
                      <option value="media">media</option>
                      <option value="baja">baja</option>
                    </select>
                    <select
                      value={t.nivel}
                      onChange={(e) => actualizarTarea(i, 'nivel', e.target.value)}
                      className="col-span-1 bg-gray-900 border border-gray-800 rounded-md px-2 py-1.5 text-sm"
                    >
                      {NIVELES.map((n) => (
                        <option key={n} value={n}>{n.slice(0, 3)}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => quitarFilaTarea(i)}
                      className="col-span-1 text-amber-500 hover:text-amber-400 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button type="button" onClick={agregarFilaTarea} className="text-sm text-blue-400 hover:text-blue-300">
                  + Agregar tarea
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  disabled={guardando}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2 rounded-md text-sm font-medium"
                >
                  {editandoCargoId ? 'Guardar cambios' : 'Crear cargo'}
                </button>
                {editandoCargoId && (
                  <button
                    type="button"
                    onClick={limpiarFormularioCargo}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
            <div className="space-y-2">
              {cargos.map((c) => (
                <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-md px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.nombre} <span className="text-xs text-gray-500">({c.nivel})</span></p>
                    <p className="text-xs text-gray-500">{c.tareasCriticas?.length || 0} tareas críticas</p>
                  </div>
                  <button onClick={() => iniciarEdicionCargo(c)} className="text-sm text-blue-400 hover:text-blue-300">
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
`;

fs.writeFileSync('app/admin/page.js', content, 'utf8');
console.log('app/admin/page.js actualizado, longitud:', content.length);