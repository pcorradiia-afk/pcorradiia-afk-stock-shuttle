"use client";

import { useEffect, useState } from "react";
import { useSesion } from "@/lib/session";
import { tienePermiso } from "@/lib/roles";
import {
  suscribir, listarEmpresas, actualizarEmpresa, listarOrganizacion,
  agregarSucursal, renombrarSucursal, eliminarSucursal, agregarEquipo, eliminarEquipo,
} from "@/lib/store";
import type { Empresa } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, Trash2, X } from "lucide-react";

export default function EmpresasPage() {
  const { usuarioActivo } = useSesion();
  const [, setTick] = useState(0);
  useEffect(() => suscribir(() => setTick((t) => t + 1)), []);

  if (!usuarioActivo) return null;
  if (!tienePermiso(usuarioActivo.roles, "config.empresas")) return <SinAcceso />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empresas</h1>
        <p className="text-muted-foreground">
          Empresas del grupo, sus sucursales y equipos. Los cambios se guardan al instante.
        </p>
      </div>

      {listarEmpresas().map((e) => <FichaEmpresa key={e.id} empresa={e} />)}
    </div>
  );
}

function FichaEmpresa({ empresa }: { empresa: Empresa }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nombre: empresa.nombre, nombreComercial: empresa.nombreComercial, cuit: empresa.cuit });
  const [nuevaSucursal, setNuevaSucursal] = useState("");
  const [equipoEn, setEquipoEn] = useState<string | null>(null); // sucursal a la que se agrega equipo
  const [nuevoEquipo, setNuevoEquipo] = useState({ nombre: "", tipo: "ventas" as "ventas" | "administracion" });

  const sucursales = listarOrganizacion(empresa.id);

  function guardarDatos() {
    if (!form.nombre.trim() || !form.nombreComercial.trim() || !form.cuit.trim()) return;
    actualizarEmpresa(empresa.id, {
      nombre: form.nombre.trim(), nombreComercial: form.nombreComercial.trim(), cuit: form.cuit.trim(),
    });
    setEditando(false);
  }

  return (
    <Card>
      <CardHeader>
        {editando ? (
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Razón social</label>
                <Input value={form.nombre} onChange={(ev) => setForm({ ...form, nombre: ev.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre comercial</label>
                <Input value={form.nombreComercial} onChange={(ev) => setForm({ ...form, nombreComercial: ev.target.value })} />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">CUIT</label>
                <Input value={form.cuit} onChange={(ev) => setForm({ ...form, cuit: ev.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={guardarDatos}>Guardar</Button>
              <Button size="sm" variant="outline" onClick={() => {
                setForm({ nombre: empresa.nombre, nombreComercial: empresa.nombreComercial, cuit: empresa.cuit });
                setEditando(false);
              }}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                {empresa.nombre}
                <Badge variant="secondary">{empresa.nombreComercial}</Badge>
              </CardTitle>
              <CardDescription>CUIT {empresa.cuit}</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" /> Editar datos
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium">Sucursales</p>
        {sucursales.length === 0 && (
          <p className="text-sm text-muted-foreground">Sin sucursales cargadas. Agregá la primera abajo.</p>
        )}
        <div className="space-y-2">
          {sucursales.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <Input
                className="h-8 w-48"
                defaultValue={s.nombre}
                onBlur={(ev) => {
                  const v = ev.target.value.trim();
                  if (v && v !== s.nombre) renombrarSucursal(empresa.id, s.id, v);
                }}
              />
              {s.equipos.map((q) => (
                <Badge key={q.id} variant={q.tipo === "ventas" ? "default" : "secondary"} className="gap-1">
                  {q.nombre}
                  <button
                    title="Quitar equipo"
                    onClick={() => eliminarEquipo(empresa.id, s.id, q.id)}
                    className="ml-1 opacity-70 hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {equipoEn === s.id ? (
                <span className="flex items-center gap-1">
                  <Input
                    className="h-8 w-40"
                    placeholder="Nombre del equipo"
                    value={nuevoEquipo.nombre}
                    onChange={(ev) => setNuevoEquipo({ ...nuevoEquipo, nombre: ev.target.value })}
                  />
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    value={nuevoEquipo.tipo}
                    onChange={(ev) => setNuevoEquipo({ ...nuevoEquipo, tipo: ev.target.value as "ventas" | "administracion" })}
                  >
                    <option value="ventas">Ventas</option>
                    <option value="administracion">Administración</option>
                  </select>
                  <Button size="sm" onClick={() => {
                    if (nuevoEquipo.nombre.trim()) {
                      agregarEquipo(empresa.id, s.id, nuevoEquipo.nombre, nuevoEquipo.tipo);
                      setNuevoEquipo({ nombre: "", tipo: "ventas" });
                      setEquipoEn(null);
                    }
                  }}>OK</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEquipoEn(null)}>Cancelar</Button>
                </span>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setEquipoEn(s.id); setNuevoEquipo({ nombre: "", tipo: "ventas" }); }}>
                  <Plus className="h-4 w-4" /> Equipo
                </Button>
              )}
              <span className="grow" />
              <Button
                size="sm"
                variant="ghost"
                title="Eliminar sucursal"
                onClick={() => {
                  if (confirm(`¿Eliminar la sucursal "${s.nombre}" y sus equipos?`)) eliminarSucursal(empresa.id, s.id);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            className="h-9 w-56"
            placeholder="Nueva sucursal (ej: Esquel)"
            value={nuevaSucursal}
            onChange={(ev) => setNuevaSucursal(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && nuevaSucursal.trim()) {
                agregarSucursal(empresa.id, nuevaSucursal);
                setNuevaSucursal("");
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (nuevaSucursal.trim()) {
                agregarSucursal(empresa.id, nuevaSucursal);
                setNuevaSucursal("");
              }
            }}
          >
            <Plus className="h-4 w-4" /> Agregar sucursal
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SinAcceso() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sin acceso</CardTitle>
        <CardDescription>Tu rol no tiene permiso para ver esta sección.</CardDescription>
      </CardHeader>
    </Card>
  );
}
