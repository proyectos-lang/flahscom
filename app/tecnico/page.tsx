"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  MapPin,
  Phone,
  Clock,
  Loader2,
  ArrowLeft,
  Play,
  CheckCircle,
  Camera,
  Wifi,
  AlertTriangle,
  Truck,
  Wrench,
  FileImage,
  PenTool,
  RefreshCw,
  XCircle,
  Ban,
  ChevronRight,
  AlertCircle,
  Home,
  Save,
  Warehouse,
} from "lucide-react"
import { getSupabaseBrowserClient } from "@/lib/supabase-client"
import { MiInventarioDialog } from "@/components/inventario/mi-inventario-dialog"
import {
  DescargaMaterialesSection,
  type DescargaItem,
} from "@/components/inventario/descarga-materiales-section"

interface CuadrillaOption {
  id: number
  nombre_cuadrilla: string
  lider_nombre: string
}

interface InstalacionTecnico {
  id: number
  tipo: "instalacion"
  contrato_id: number
  cuadrilla_id: number
  fecha_programada: string
  bloque_horario: string
  estatus_instalacion: string
  hora_inicio: string | null
  hora_fin: string | null
  serie_ont_router: string | null
  serie_antena_receptor: string | null
  url_foto_potencia_caset: string | null
  url_foto_pi_fibra: string | null
  url_foto_pf_fibra: string | null
  url_foto_numeracion_nap: string | null
  url_foto_etiqueta_cliente_nap: string | null
  url_foto_potencia_liuk: string | null
  url_foto_serie_equipo: string | null
  url_foto_potencia_interna: string | null
  url_foto_contrasena: string | null
  url_foto_test_velocidad: string | null
  url_foto_estetico_equipos: string | null
  url_foto_tv_pantalla: string | null
  url_firma_cliente: string | null
  observaciones_tecnicas: string | null
  nombre_completo: string
  telefono: string
  direccion: string
  latitud: number | null
  longitud: number | null
  nombre_paquete: string
  valor_paquete: number
  numero_contador: string
  velocidad: string
}

interface FallaTecnico {
  id: number
  tipo: "falla"
  contrato_id: number
  cuadrilla_id: number
  fecha_programada: string
  bloque_horario: string
  estatus_falla: string
  tipo_falla: string
  descripcion_falla: string | null
  hora_inicio: string | null
  hora_fin: string | null
  urls_evidencias: string[] | null
  url_firma_cliente: string | null
  observaciones_tecnico: string | null
  nombre_completo: string
  telefono: string
  telefono_contacto_adicional: string
  direccion: string
  latitud: number | null
  longitud: number | null
  nombre_paquete: string
  valor_paquete: number
  numero_contador: string
  velocidad: string
}

type TareaAgenda = InstalacionTecnico | FallaTecnico

// Steps para instalación
const STEPS_INSTALACION = [
  { id: 1, label: "Llegada", icon: Truck },
  { id: 2, label: "Instalacion", icon: Wrench },
  { id: 3, label: "Evidencias", icon: FileImage },
  { id: 4, label: "Firma y Cierre", icon: PenTool },
]

// Steps para falla
const STEPS_FALLA = [
  { id: 1, label: "Llegada", icon: Truck },
  { id: 2, label: "Evidencias", icon: FileImage },
  { id: 3, label: "Firma y Cierre", icon: PenTool },
]

export default function TecnicoPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [tareas, setTareas] = useState<TareaAgenda[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTarea, setSelectedTarea] = useState<TareaAgenda | null>(null)
  const [cuadrillaId, setCuadrillaId] = useState<number | null>(null)
  const [cuadrillaName, setCuadrillaName] = useState("")
  const [cuadrillasOptions, setCuadrillasOptions] = useState<CuadrillaOption[]>([])
  const [loadingCuadrillas, setLoadingCuadrillas] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showFail, setShowFail] = useState(false)

  // Form state para instalaciones
  const [serieOnt, setSerieOnt] = useState("")
  const [serieAntena, setSerieAntena] = useState("")
  const [observaciones, setObservaciones] = useState("")
  
  // Photo states para instalaciones (12 obligatorias)
  const [fotoPotenciaCaset, setFotoPotenciaCaset] = useState<string | null>(null)
  const [fotoPiFibra, setFotoPiFibra] = useState<string | null>(null)
  const [fotoPfFibra, setFotoPfFibra] = useState<string | null>(null)
  const [fotoNumeracionNap, setFotoNumeracionNap] = useState<string | null>(null)
  const [fotoEtiquetaClienteNap, setFotoEtiquetaClienteNap] = useState<string | null>(null)
  const [fotoPotenciaLiuk, setFotoPotenciaLiuk] = useState<string | null>(null)
  const [fotoSerieEquipo, setFotoSerieEquipo] = useState<string | null>(null)
  const [fotoPotenciaInterna, setFotoPotenciaInterna] = useState<string | null>(null)
  const [fotoContrasena, setFotoContrasena] = useState<string | null>(null)
  const [fotoTestVelocidad, setFotoTestVelocidad] = useState<string | null>(null)
  const [fotoEsteticoEquipos, setFotoEsteticoEquipos] = useState<string | null>(null)
  const [fotoTvPantalla, setFotoTvPantalla] = useState<string | null>(null)

  // Upload states
  const [uploadingStates, setUploadingStates] = useState<Record<string, boolean>>({
    potenciaCaset: false,
    piFibra: false,
    pfFibra: false,
    numeracionNap: false,
    etiquetaClienteNap: false,
    potenciaLiuk: false,
    serieEquipo: false,
    potenciaInterna: false,
    contrasena: false,
    testVelocidad: false,
    esteticoEquipos: false,
    tvPantalla: false,
  })

  // Falla-specific states
  const [fotosGaleriaFalla, setFotosGaleriaFalla] = useState<string[]>([])
  const [uploadingGaleria, setUploadingGaleria] = useState(false)
  const [showReprogramar, setShowReprogramar] = useState(false)
  const [nuevaFechaPreferencia, setNuevaFechaPreferencia] = useState("")

  // Reschedule states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [tareaToReschedule, setTareaToReschedule] = useState<TareaAgenda | null>(null)
  const [nuevaFechaProgramada, setNuevaFechaProgramada] = useState("")
  const [rescheduleComentario, setRescheduleComentario] = useState("")
  const [rescheduling, setRescheduling] = useState(false)

  // Reject states
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [tareaToReject, setTareaToReject] = useState<TareaAgenda | null>(null)
  const [rejectComentario, setRejectComentario] = useState("")
  const [rejecting, setRejecting] = useState(false)

  // Password authentication states
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingCuadrillaId, setPendingCuadrillaId] = useState<number | null>(null)
  const [pendingCuadrillaName, setPendingCuadrillaName] = useState("")
  const [passwordInput, setPasswordInput] = useState("")
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  // Mi Inventario dialog
  const [showMiInventario, setShowMiInventario] = useState(false)

  // Materials descargue collected during step 2 of the install wizard.
  // Posted to /api/inventario/descarga at handleFinalizar time.
  const [descargaItems, setDescargaItems] = useState<DescargaItem[]>([])

  // Signature pad
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)

  // Load cuadrillas on mount
  useEffect(() => {
    const loadCuadrillas = async () => {
      try {
        const res = await fetch("/api/programacion/cuadrillas")
        const data = await res.json()
        if (data.success) {
          setCuadrillasOptions(data.data || [])
        }
      } catch (error) {
        console.error("[v0] Error loading cuadrillas:", error)
      } finally {
        setLoadingCuadrillas(false)
      }
    }
    loadCuadrillas()
  }, [])

  // Load tareas when cuadrilla is selected
  useEffect(() => {
    const loadTareas = async () => {
      if (!cuadrillaId) return
      setLoading(true)
      try {
        const res = await fetch(`/api/tecnico?cuadrilla_id=${cuadrillaId}`)
        const data = await res.json()
        if (data.success) {
          setTareas(data.data || [])
        }
      } catch (error) {
        console.error("[v0] Error loading tareas:", error)
      } finally {
        setLoading(false)
      }
    }
    if (cuadrillaId) {
      loadTareas()
    }
  }, [cuadrillaId])

  // Redirect if no permissions
  useEffect(() => {
    if (!authLoading && (!user || !user.permissions?.vista_tecnico)) {
      router.push('/dashboard')
    }
  }, [authLoading, user, router])

  // Signature pad handlers - MUST be before any conditional returns
  const startDrawing = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    setIsDrawing(true)
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.beginPath()
      ctx.moveTo(x, y)
    }
  }, [])

  const draw = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }, [isDrawing])

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    setHasSignature(true)
  }, [])

  // Canvas setup effect - MUST be before early returns
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.strokeStyle = "#000"
      ctx.lineWidth = 2
      ctx.lineCap = "round"
    }
  }, [selectedTarea])

  // Early returns for auth checks - but ALL hooks must be called before this point
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    )
  }

  if (!user || !user.permissions?.vista_tecnico) {
    return null
  }

  // All functions and handlers defined AFTER early returns to avoid hook order issues
  // Load tareas function
  const loadTareas = async () => {
    if (!cuadrillaId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/tecnico?cuadrilla_id=${cuadrillaId}`)
      const data = await res.json()
      if (data.success) {
        setTareas(data.data || [])
      }
    } catch (error) {
      console.error("[v0] Error loading tareas:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCuadrilla = (id: number, nombre: string) => {
    setPendingCuadrillaId(id)
    setPendingCuadrillaName(nombre)
    setPasswordInput("")
    setPasswordError("")
    setShowPasswordModal(true)
  }

  const handleVerifyPassword = async () => {
    if (!pendingCuadrillaId || !passwordInput) {
      setPasswordError("Por favor ingrese la contraseña")
      return
    }

    setVerifyingPassword(true)
    setPasswordError("")

    try {
      const res = await fetch("/api/cuadrillas/verify-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cuadrilla_id: pendingCuadrillaId,
          password: passwordInput,
        }),
      })

      const data = await res.json()

      if (data.success) {
        // Password correct, set cuadrilla
        setCuadrillaId(pendingCuadrillaId)
        setCuadrillaName(pendingCuadrillaName)
        setShowPasswordModal(false)
        setPasswordInput("")
        setPendingCuadrillaId(null)
        setPendingCuadrillaName("")
      } else {
        setPasswordError("Contraseña incorrecta")
      }
    } catch (error) {
      console.error("[v0] Error verifying password:", error)
      setPasswordError("Error al verificar la contraseña")
    } finally {
      setVerifyingPassword(false)
    }
  }

  // File upload via API endpoint
  type PhotoType = "potenciaCaset" | "piFibra" | "pfFibra" | "numeracionNap" | "etiquetaClienteNap" | "potenciaLiuk" | "serieEquipo" | "potenciaInterna" | "contrasena" | "testVelocidad" | "esteticoEquipos" | "tvPantalla"

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: PhotoType) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingStates(prev => ({ ...prev, [type]: true }))

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", type)
      formData.append("instalacionId", String(selectedTarea?.id))

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        console.error("[v0] Upload error:", data.error)
        alert("Error al subir la imagen: " + data.error)
        return
      }

      const photoFieldMap: Record<PhotoType, string> = {
        potenciaCaset:      "url_foto_potencia_caset",
        piFibra:            "url_foto_pi_fibra",
        pfFibra:            "url_foto_pf_fibra",
        numeracionNap:      "url_foto_numeracion_nap",
        etiquetaClienteNap: "url_foto_etiqueta_cliente_nap",
        potenciaLiuk:       "url_foto_potencia_liuk",
        serieEquipo:        "url_foto_serie_equipo",
        potenciaInterna:    "url_foto_potencia_interna",
        contrasena:         "url_foto_contrasena",
        testVelocidad:      "url_foto_test_velocidad",
        esteticoEquipos:    "url_foto_estetico_equipos",
        tvPantalla:         "url_foto_tv_pantalla",
      }

      switch (type) {
        case "potenciaCaset": setFotoPotenciaCaset(data.url); break
        case "piFibra": setFotoPiFibra(data.url); break
        case "pfFibra": setFotoPfFibra(data.url); break
        case "numeracionNap": setFotoNumeracionNap(data.url); break
        case "etiquetaClienteNap": setFotoEtiquetaClienteNap(data.url); break
        case "potenciaLiuk": setFotoPotenciaLiuk(data.url); break
        case "serieEquipo": setFotoSerieEquipo(data.url); break
        case "potenciaInterna": setFotoPotenciaInterna(data.url); break
        case "contrasena": setFotoContrasena(data.url); break
        case "testVelocidad": setFotoTestVelocidad(data.url); break
        case "esteticoEquipos": setFotoEsteticoEquipos(data.url); break
        case "tvPantalla": setFotoTvPantalla(data.url); break
      }

      // Auto-save this photo to DB immediately so progress is never lost
      if (selectedTarea?.tipo === "instalacion") {
        fetch(`/api/tecnico/${selectedTarea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [photoFieldMap[type]]: data.url }),
        }).catch((e) => console.error("[v0] Error auto-guardando foto:", e))
      }
    } catch (error) {
      console.error("[v0] Upload error:", error)
      alert("Error al subir la imagen")
    } finally {
      setUploadingStates(prev => ({ ...prev, [type]: false }))
    }
  }

  // Handle multiple file upload for fallas
  const handleGaleriaFallaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (fotosGaleriaFalla.length + files.length > 10) {
      alert("Máximo 10 fotos permitidas")
      return
    }

    setUploadingGaleria(true)

    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", "falla_evidencia")
        formData.append("instalacionId", String(selectedTarea?.id))

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        })

        const data = await res.json()
        if (res.ok) {
          return data.url
        }
        return null
      })

      const urls = await Promise.all(uploadPromises)
      const validUrls = urls.filter(url => url !== null) as string[]
      setFotosGaleriaFalla(prev => [...prev, ...validUrls])
    } catch (error) {
      console.error("[v0] Upload error:", error)
      alert("Error al subir las imágenes")
    } finally {
      setUploadingGaleria(false)
    }
  }

  const resetForm = (keepCurrentStep = false) => {
    setSerieOnt("")
    setSerieAntena("")
    setObservaciones("")
    setFotoPotenciaCaset(null)
    setFotoPiFibra(null)
    setFotoPfFibra(null)
    setFotoNumeracionNap(null)
    setFotoEtiquetaClienteNap(null)
    setFotoPotenciaLiuk(null)
    setFotoSerieEquipo(null)
    setFotoPotenciaInterna(null)
    setFotoContrasena(null)
    setFotoTestVelocidad(null)
    setFotoEsteticoEquipos(null)
    setFotoTvPantalla(null)
    setFotosGaleriaFalla([])
    setHasSignature(false)
    setDescargaItems([])
    if (!keepCurrentStep) {
      setCurrentStep(1)
    }
    setShowFail(false)
    setShowReprogramar(false)
    setNuevaFechaPreferencia("")
  }

  const detectCurrentStep = (tarea: TareaAgenda): number => {
    // Si no está en proceso, paso 1
    const isInProgress = tarea.tipo === "instalacion" 
      ? (tarea as InstalacionTecnico).estatus_instalacion === "en_proceso"
      : (tarea as FallaTecnico).estatus_falla === "en_proceso"
    
    if (!isInProgress) return 1

    if (tarea.tipo === "instalacion") {
      const instalacion = tarea as InstalacionTecnico
      if (instalacion.serie_ont_router && instalacion.serie_antena_receptor) {
        // Si ya tiene todas las fotos, llevar al paso de firma
        const allPhotos = [
          instalacion.url_foto_potencia_caset,
          instalacion.url_foto_pi_fibra,
          instalacion.url_foto_pf_fibra,
          instalacion.url_foto_numeracion_nap,
          instalacion.url_foto_etiqueta_cliente_nap,
          instalacion.url_foto_potencia_liuk,
          instalacion.url_foto_serie_equipo,
          instalacion.url_foto_potencia_interna,
          instalacion.url_foto_contrasena,
          instalacion.url_foto_test_velocidad,
          instalacion.url_foto_estetico_equipos,
          instalacion.url_foto_tv_pantalla,
        ]
        if (allPhotos.every(Boolean)) {
          return 4 // Paso de firma — todas las fotos completas
        }
        return 3 // Paso de evidencias — series registradas pero faltan fotos
      }
      // Si tiene hora_inicio pero no equipos, está en paso 2
      if (instalacion.hora_inicio) {
        return 2
      }
    } else {
      // Para fallas
      const falla = tarea as FallaTecnico
      // Si tiene hora_inicio, está en paso 2 (evidencias)
      if (falla.hora_inicio) {
        return 2 // Paso de evidencias para fallas
      }
    }

    return 1
  }

  const handleOpenReschedule = (tarea: TareaAgenda, e: React.MouseEvent) => {
    e.stopPropagation()
    setTareaToReschedule(tarea)
    setNuevaFechaProgramada(tarea.fecha_programada)
    setShowRescheduleModal(true)
  }

  const handleConfirmReschedule = async () => {
    if (!tareaToReschedule || !nuevaFechaProgramada) return

    setRescheduling(true)
    try {
      const res = await fetch(`/api/tecnico/${tareaToReschedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: tareaToReschedule.tipo,
          fecha_programada: nuevaFechaProgramada,
          observaciones_tecnicas: rescheduleComentario || undefined,
        }),
      })

      if (res.ok) {
        alert("Tarea reagendada exitosamente")
        setShowRescheduleModal(false)
        setTareaToReschedule(null)
        setRescheduleComentario("")
        await loadTareas()
      } else {
        alert("Error al reagendar la tarea")
      }
    } catch (error) {
      console.error("[v0] Error al reagendar:", error)
      alert("Error al reagendar la tarea")
    } finally {
      setRescheduling(false)
    }
  }

  const handleOpenReject = (tarea: TareaAgenda, e: React.MouseEvent) => {
    e.stopPropagation()
    setTareaToReject(tarea)
    setRejectComentario("")
    setShowRejectModal(true)
  }

  const handleConfirmReject = async () => {
    if (!tareaToReject) return

    setRejecting(true)
    try {
      const isInstalacion = tareaToReject.tipo === "instalacion"
      const body: any = {
        tipo: tareaToReject.tipo,
        observaciones_tecnicas: rejectComentario || undefined,
      }
      if (isInstalacion) {
        body.estatus_instalacion = "fallido"
      } else {
        body.estatus_falla = "fallida"
      }

      const res = await fetch(`/api/tecnico/${tareaToReject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        alert("Orden rechazada")
        setShowRejectModal(false)
        setTareaToReject(null)
        setRejectComentario("")
        await loadTareas()
      } else {
        alert("Error al rechazar la orden")
      }
    } catch (error) {
      console.error("[v0] Error al rechazar:", error)
      alert("Error al rechazar la orden")
    } finally {
      setRejecting(false)
    }
  }

  const handleSelectTarea = (tarea: TareaAgenda) => {
    setSelectedTarea(tarea)
    // Si la tarea ya está en proceso, detectar el paso actual
    const isInProgress = tarea.tipo === "instalacion" 
      ? (tarea as InstalacionTecnico).estatus_instalacion === "en_proceso"
      : (tarea as FallaTecnico).estatus_falla === "en_proceso"
    
    // Always restore any previously saved data
    if (tarea.tipo === "instalacion") {
      const instalacion = tarea as InstalacionTecnico
      if (instalacion.serie_ont_router) setSerieOnt(instalacion.serie_ont_router)
      if (instalacion.serie_antena_receptor) setSerieAntena(instalacion.serie_antena_receptor)
      if (instalacion.observaciones_tecnicas) setObservaciones(instalacion.observaciones_tecnicas)
      setFotoPotenciaCaset(instalacion.url_foto_potencia_caset)
      setFotoPiFibra(instalacion.url_foto_pi_fibra)
      setFotoPfFibra(instalacion.url_foto_pf_fibra)
      setFotoNumeracionNap(instalacion.url_foto_numeracion_nap)
      setFotoEtiquetaClienteNap(instalacion.url_foto_etiqueta_cliente_nap)
      setFotoPotenciaLiuk(instalacion.url_foto_potencia_liuk)
      setFotoSerieEquipo(instalacion.url_foto_serie_equipo)
      setFotoPotenciaInterna(instalacion.url_foto_potencia_interna)
      setFotoContrasena(instalacion.url_foto_contrasena)
      setFotoTestVelocidad(instalacion.url_foto_test_velocidad)
      setFotoEsteticoEquipos(instalacion.url_foto_estetico_equipos)
      setFotoTvPantalla(instalacion.url_foto_tv_pantalla)
    } else {
      const falla = tarea as FallaTecnico
      if (falla.observaciones_tecnico) setObservaciones(falla.observaciones_tecnico)
      if (falla.urls_evidencias && falla.urls_evidencias.length > 0) {
        setFotosGaleriaFalla(falla.urls_evidencias)
      }
    }

    if (isInProgress) {
      setCurrentStep(detectCurrentStep(tarea))
    } else {
      setCurrentStep(1)
    }
  }

  const getHondurasTime = () => {
    const hn = new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Tegucigalpa",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date())
    return hn // "HH:MM:SS"
  }

  const getHondurasDate = () => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Tegucigalpa",
    }).format(new Date()) // "YYYY-MM-DD"
  }

  const handleIniciar = async () => {
    if (!selectedTarea) return
    setSubmitting(true)
    try {
      const now = getHondurasTime()

      if (selectedTarea.tipo === "instalacion") {
        const res = await fetch(`/api/tecnico/${selectedTarea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estatus_instalacion: "en_proceso",
            hora_inicio: now,
          }),
        })

        if (res.ok) {
          setCurrentStep(2)
          // Update selectedTarea with new status
          setSelectedTarea({
            ...selectedTarea,
            estatus_instalacion: "en_proceso",
            hora_inicio: now,
          } as InstalacionTecnico)
          await loadTareas()
        }
      } else {
        // Falla
        const res = await fetch(`/api/fallas/${selectedTarea.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estatus_falla: "en_proceso",
            hora_inicio: now,
          }),
        })

        if (res.ok) {
          setCurrentStep(2)
          // Update selectedTarea with new status
          setSelectedTarea({
            ...selectedTarea,
            estatus_falla: "en_proceso",
            hora_inicio: now,
          } as FallaTecnico)
          await loadTareas()
        }
      }
    } catch (error) {
      console.error("[v0] Error al iniciar:", error)
      alert("Error al iniciar la tarea")
    } finally {
      setSubmitting(false)
    }
  }

  const [savingParcial, setSavingParcial] = useState(false)
  const [savedParcial, setSavedParcial] = useState(false)

  const handleGuardarParcial = async () => {
    if (!selectedTarea || selectedTarea.tipo !== "instalacion") return
    setSavingParcial(true)
    try {
      const res = await fetch(`/api/tecnico/${selectedTarea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url_foto_potencia_caset: fotoPotenciaCaset,
          url_foto_pi_fibra: fotoPiFibra,
          url_foto_pf_fibra: fotoPfFibra,
          url_foto_numeracion_nap: fotoNumeracionNap,
          url_foto_etiqueta_cliente_nap: fotoEtiquetaClienteNap,
          url_foto_potencia_liuk: fotoPotenciaLiuk,
          url_foto_serie_equipo: fotoSerieEquipo,
          url_foto_potencia_interna: fotoPotenciaInterna,
          url_foto_contrasena: fotoContrasena,
          url_foto_test_velocidad: fotoTestVelocidad,
          url_foto_estetico_equipos: fotoEsteticoEquipos,
          url_foto_tv_pantalla: fotoTvPantalla,
        }),
      })
      if (res.ok) {
        setSavedParcial(true)
        setTimeout(() => setSavedParcial(false), 3000)
      } else {
        alert("Error al guardar parcialmente")
      }
    } catch (error) {
      console.error("[v0] Error al guardar parcial:", error)
      alert("Error al guardar")
    } finally {
      setSavingParcial(false)
    }
  }

  // Discharges the materials/equipment selected for this job from the
  // cuadrilla's inventory into the contract. Throws (surfacing the server
  // error message) on failure so the caller can block the success screen
  // until the inventory transactions have actually resolved.
  const descargarInventario = async (contratoId: number, refLabel: string) => {
    console.log("[v0] descargarInventario start", {
      contratoId,
      refLabel,
      cuadrillaId,
      descargaItemsCount: descargaItems.length,
      descargaItems,
    })

    // Nothing selected: legitimately nothing to discharge.
    if (descargaItems.length === 0) {
      console.log("[v0] descargarInventario: no items selected, skipping")
      return
    }

    // Items were selected but we don't know the cuadrilla — this would
    // silently skip the consumption, so surface it instead of hiding it.
    if (!cuadrillaId) {
      throw new Error(
        "No se pudo identificar la cuadrilla para descargar el inventario. Vuelve a iniciar sesion.",
      )
    }

    const serial_ids = descargaItems
      .filter((i) => i.tipo === "Serializado" && i.serial_id)
      .map((i) => i.serial_id as number)

    const miscMap = new Map<number, number>()
    for (const i of descargaItems) {
      if (i.tipo === "Miscelaneo") {
        miscMap.set(i.producto_id, (miscMap.get(i.producto_id) || 0) + i.cantidad)
      }
    }
    const miscelaneo = Array.from(miscMap.entries()).map(([producto_id, cantidad]) => ({
      producto_id,
      cantidad,
    }))

    const payload = {
      contrato_id: contratoId,
      cuadrilla_id: cuadrillaId,
      serial_ids,
      miscelaneo,
      usuario_registro: cuadrillaName || "tecnico",
      observaciones: refLabel,
    }
    console.log("[v0] descargarInventario POST payload", payload)

    const descRes = await fetch("/api/inventario/descarga", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    const result = await descRes.json().catch(() => ({}))
    console.log("[v0] descargarInventario response", { status: descRes.status, result })

    if (!descRes.ok || !result?.success) {
      throw new Error(result?.error || "No se pudo descargar el inventario")
    }
  }

  const handleFinalizar = async () => {
    if (!selectedTarea || !hasSignature) {
      alert("Por favor complete la firma antes de finalizar")
      return
    }

    setSubmitting(true)

    try {
      const canvas = canvasRef.current
      if (!canvas) return

      const firmaUrl = canvas.toDataURL("image/png")
      const now = getHondurasTime()
      const today = getHondurasDate()

      if (selectedTarea.tipo === "instalacion") {
        const res = await fetch(`/api/tecnico/${selectedTarea.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estatus_instalacion: "instalado",
            serie_ont_router: serieOnt.trim(),
            serie_antena_receptor: serieAntena.trim(),
            url_foto_potencia_caset: fotoPotenciaCaset,
            url_foto_pi_fibra: fotoPiFibra,
            url_foto_pf_fibra: fotoPfFibra,
            url_foto_numeracion_nap: fotoNumeracionNap,
            url_foto_etiqueta_cliente_nap: fotoEtiquetaClienteNap,
            url_foto_potencia_liuk: fotoPotenciaLiuk,
            url_foto_serie_equipo: fotoSerieEquipo,
            url_foto_potencia_interna: fotoPotenciaInterna,
            url_foto_contrasena: fotoContrasena,
            url_foto_test_velocidad: fotoTestVelocidad,
            url_foto_estetico_equipos: fotoEsteticoEquipos,
            url_foto_tv_pantalla: fotoTvPantalla,
            url_firma_cliente: firmaUrl,
            observaciones_tecnicas: observaciones.trim() || null,
            hora_fin: now,
            fecha_real_instalacion: today,
          }),
        })

        if (res.ok) {
          // Descargue de inventario asociado a la instalación. Se ejecuta
          // después del PATCH exitoso y DEBE resolverse antes de mostrar el
          // éxito: si falla, avisamos al técnico y no marcamos como finalizado
          // para que pueda reintentar (el registro ya quedó como instalado).
          try {
            await descargarInventario(
              (selectedTarea as InstalacionTecnico).contrato_id,
              `Instalacion #${selectedTarea.id}`,
            )
          } catch (e: any) {
            console.error("[v0] Error descargue inventario:", e)
            alert(
              `La instalación se guardó pero falló el descargo de inventario: ${e.message}. Verifica el stock de tu cuadrilla e inténtalo de nuevo.`,
            )
            setSubmitting(false)
            return
          }

          setShowSuccess(true)
          await loadTareas()
          setTimeout(() => {
            setShowSuccess(false)
            setSelectedTarea(null)
            resetForm()
          }, 3000)
        } else {
          alert("Error al finalizar la instalación")
        }
      } else {
        // Falla
        const res = await fetch(`/api/fallas/${selectedTarea.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            estatus_falla: "resuelta",
            urls_evidencias: fotosGaleriaFalla,
            url_firma_cliente: firmaUrl,
            observaciones_tecnico: observaciones.trim() || null,
            hora_fin: now,
            fecha_real_resolucion: today,
          }),
        })

        if (res.ok) {
          // Descargue de inventario asociado al cierre de la falla. Igual que
          // en instalaciones, debe resolverse antes de mostrar el éxito: si
          // falla, avisamos al técnico y no marcamos como finalizado para que
          // pueda reintentar (la falla ya quedó como resuelta).
          try {
            await descargarInventario(
              (selectedTarea as FallaTecnico).contrato_id,
              `Falla #${selectedTarea.id}`,
            )
          } catch (e: any) {
            console.error("[v0] Error descargue inventario falla:", e)
            alert(
              `La falla se cerró pero falló el descargo de inventario: ${e.message}. Verifica el stock de tu cuadrilla e inténtalo de nuevo.`,
            )
            setSubmitting(false)
            return
          }

          setShowSuccess(true)
          await loadTareas()
          setTimeout(() => {
            setShowSuccess(false)
            setSelectedTarea(null)
            resetForm()
          }, 3000)
        } else {
          alert("Error al finalizar la falla")
        }
      }
    } catch (error) {
      console.error("[v0] Error al finalizar:", error)
      alert("Error al finalizar")
    } finally {
      setSubmitting(false)
    }
  }

  const handleReprogramar = async () => {
    if (!selectedTarea || selectedTarea.tipo !== "falla" || !nuevaFechaPreferencia) {
      alert("Por favor ingrese una nueva fecha")
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/fallas/${selectedTarea.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estatus_falla: "reportada",
          fecha_preferencia_cliente: nuevaFechaPreferencia,
        }),
      })

      if (res.ok) {
        alert("Falla reprogramada exitosamente")
        await loadTareas()
        setSelectedTarea(null)
        resetForm()
      } else {
        alert("Error al reprogramar la falla")
      }
    } catch (error) {
      console.error("[v0] Error al reprogramar:", error)
      alert("Error al reprogramar")
    } finally {
      setSubmitting(false)
    }
  }



  const clearSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }

  const currentSteps = selectedTarea?.tipo === "falla" ? STEPS_FALLA : STEPS_INSTALACION

  if (loadingCuadrillas) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 flex items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    )
  }

  if (!cuadrillaId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 p-4">
        <div className="max-w-md mx-auto pt-20">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Selecciona tu Cuadrilla</h1>
          <div className="space-y-3">
            {cuadrillasOptions.map((c) => (
              <Card
                key={c.id}
                className="p-4 cursor-pointer hover:bg-orange-50 transition-colors"
                onClick={() => handleSelectCuadrilla(c.id, c.nombre_cuadrilla)}
              >
                <div className="font-semibold text-gray-900">{c.nombre_cuadrilla}</div>
                <div className="text-sm text-gray-600">Líder: {c.lider_nombre}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Password Modal */}
        <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verificación de Cuadrilla</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm font-medium text-gray-900">{pendingCuadrillaName}</p>
                <p className="text-xs text-gray-600 mt-1">Ingrese la contraseña de la cuadrilla para acceder</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
                <Input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value)
                    setPasswordError("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyPassword()
                    }
                  }}
                  placeholder="Ingrese la contraseña"
                  className={passwordError ? "border-red-500" : ""}
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordModal(false)
                    setPasswordInput("")
                    setPasswordError("")
                    setPendingCuadrillaId(null)
                    setPendingCuadrillaName("")
                  }}
                  disabled={verifyingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleVerifyPassword}
                  disabled={verifyingPassword || !passwordInput}
                >
                  {verifyingPassword ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-sm mx-auto">
          <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Completado!</h2>
          <p className="text-gray-600">La tarea ha sido finalizada exitosamente</p>
        </Card>
      </div>
    )
  }

  if (selectedTarea) {
    const isInstalacion = selectedTarea.tipo === "instalacion"
    const estatus = isInstalacion 
      ? (selectedTarea as InstalacionTecnico).estatus_instalacion 
      : (selectedTarea as FallaTecnico).estatus_falla

    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 pb-20">
        {/* Header */}
        <div className="bg-orange-600 text-white p-4 sticky top-0 z-10 shadow-md">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTarea(null)}
              className="text-white hover:bg-orange-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <div className="font-semibold">{selectedTarea.nombre_completo}</div>
              <div className="text-xs opacity-90 flex items-center gap-2">
                {isInstalacion ? <Home className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {isInstalacion ? "Instalación Nueva" : `Falla: ${(selectedTarea as FallaTecnico).tipo_falla}`}
              </div>
            </div>
            <Badge className="bg-white text-orange-600">{selectedTarea.bloque_horario}</Badge>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="bg-white p-4 shadow-sm">
          <div className="flex justify-between max-w-2xl mx-auto">
            {currentSteps.map((step, index) => {
              const StepIcon = step.icon
              const isActive = currentStep === step.id
              const isCompleted = currentStep > step.id
              return (
                <div key={step.id} className="flex-1 relative">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-600"
                          : isActive
                          ? "bg-orange-600"
                          : "bg-gray-200"
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <StepIcon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-500"}`} />
                      )}
                    </div>
                    <span className="text-xs mt-1 text-gray-600 text-center">{step.label}</span>
                  </div>
                  {index < currentSteps.length - 1 && (
                    <div
                      className={`absolute top-5 left-1/2 w-full h-0.5 ${
                        currentStep > step.id ? "bg-green-600" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Client Info Card */}
          <Card className="p-4 bg-white/80 backdrop-blur-sm">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Teléfono:</span>
                <span className="text-gray-900 font-medium">
                  {selectedTarea.telefono}
                </span>
              </div>
              {!isInstalacion && (selectedTarea as FallaTecnico).telefono_contacto_adicional && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Contacto adicional:</span>
                  <span className="text-gray-900 font-medium">
                    {(selectedTarea as FallaTecnico).telefono_contacto_adicional}
                  </span>
                </div>
              )}
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                <span className="text-gray-600">Dirección:</span>
                <span className="text-gray-900 flex-1">{selectedTarea.direccion}</span>
              </div>
              {!isInstalacion && selectedTarea.latitud && selectedTarea.longitud && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${selectedTarea.latitud},${selectedTarea.longitud}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline text-sm font-medium"
                  >
                    Ver ruta en Google Maps
                  </a>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-gray-500" />
                <span className="text-gray-600">Plan:</span>
                <span className="text-gray-900 font-medium">
                  {selectedTarea.velocidad ? `${selectedTarea.velocidad} - ${selectedTarea.nombre_paquete}` : selectedTarea.nombre_paquete}
                </span>
              </div>
              {!isInstalacion && (
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="font-semibold text-sm text-gray-900 mb-1">
                    Tipo: {(selectedTarea as FallaTecnico).tipo_falla}
                  </div>
                  {(selectedTarea as FallaTecnico).descripcion_falla && (
                    <div className="text-sm text-gray-700">
                      {(selectedTarea as FallaTecnico).descripcion_falla}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* STEP 1: Llegada */}
          {currentStep === 1 && estatus === "programada" && (
            <Card className="p-6 text-center bg-white space-y-4">
              <Truck className="w-16 h-16 text-orange-600 mx-auto" />
              <h2 className="text-xl font-bold text-gray-900">¿Ya llegaste al lugar?</h2>
              <p className="text-gray-600 text-sm">Presiona el botón cuando estés en el sitio para iniciar</p>
              <Button
                onClick={handleIniciar}
                disabled={submitting}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
                {submitting ? "Iniciando..." : "Iniciar Tarea"}
              </Button>
            </Card>
          )}

          {/* STEP 2: Instalación (solo para instalaciones) */}
          {isInstalacion && currentStep === 2 && (
            <Card className="p-5 rounded-xl shadow-sm bg-white space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">Datos de Equipos</h2>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Serie ONT / Router
                  </label>
                  <Input
                    value={serieOnt}
                    onChange={(e) => setSerieOnt(e.target.value)}
                    placeholder="Ingresa la serie del ONT/Router"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Serie Antena / Receptor
                  </label>
                  <Input
                    value={serieAntena}
                    onChange={(e) => setSerieAntena(e.target.value)}
                    placeholder="Ingresa la serie de la Antena/Receptor"
                    className="text-sm"
                  />
                </div>
              </div>

              <DescargaMaterialesSection
                cuadrillaId={cuadrillaId}
                value={descargaItems}
                onChange={setDescargaItems}
              />

              <Button
                onClick={async () => {
                  if (!selectedTarea) return
                  try {
                    await fetch(`/api/tecnico/${selectedTarea.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        serie_ont_router: serieOnt.trim(),
                        serie_antena_receptor: serieAntena.trim(),
                      }),
                    })
                  } catch (e) {
                    console.error("[v0] Error guardando series:", e)
                  }
                  setCurrentStep(3)
                }}
                disabled={!serieOnt.trim() || !serieAntena.trim()}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl"
              >
                Continuar a Evidencias
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          )}

          {/* STEP 2/3: Evidencias */}
          {((isInstalacion && currentStep === 3) || (!isInstalacion && currentStep === 2)) && (
            <Card className="p-5 rounded-xl shadow-sm bg-white space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <FileImage className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">Evidencias Fotográficas</h2>
              </div>

              {isInstalacion ? (
                // Grid de 12 fotos obligatorias para instalación
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { key: "potenciaCaset",      label: "Potencia de Salida del Caset",  url: fotoPotenciaCaset,      setter: setFotoPotenciaCaset },
                    { key: "piFibra",            label: "PI Fibra",                       url: fotoPiFibra,            setter: setFotoPiFibra },
                    { key: "pfFibra",            label: "PF Fibra",                       url: fotoPfFibra,            setter: setFotoPfFibra },
                    { key: "numeracionNap",      label: "Numeración NAP",                 url: fotoNumeracionNap,      setter: setFotoNumeracionNap },
                    { key: "etiquetaClienteNap", label: "Etiqueta del Cliente en NAP",    url: fotoEtiquetaClienteNap, setter: setFotoEtiquetaClienteNap },
                    { key: "potenciaLiuk",       label: "Potencia LIUK",                  url: fotoPotenciaLiuk,       setter: setFotoPotenciaLiuk },
                    { key: "serieEquipo",        label: "Serie Equipo",                   url: fotoSerieEquipo,        setter: setFotoSerieEquipo },
                    { key: "potenciaInterna",    label: "Potencia Interna",               url: fotoPotenciaInterna,    setter: setFotoPotenciaInterna },
                    { key: "contrasena",         label: "Contraseña",                     url: fotoContrasena,         setter: setFotoContrasena },
                    { key: "testVelocidad",      label: "Test de Velocidad",              url: fotoTestVelocidad,      setter: setFotoTestVelocidad },
                    { key: "esteticoEquipos",    label: "Estético LIUK y ONU",            url: fotoEsteticoEquipos,    setter: setFotoEsteticoEquipos },
                    { key: "tvPantalla",         label: "TV Pantalla",                    url: fotoTvPantalla,         setter: setFotoTvPantalla },
                  ] as { key: PhotoType; label: string; url: string | null; setter: (v: string | null) => void }[]).map(({ key, label, url, setter }) => (
                    <div key={key} className={`border rounded-lg p-3 space-y-2 ${url ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                      <div className="flex items-center gap-1">
                        {url && <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />}
                        <label className="text-[10px] font-semibold text-gray-700 block leading-tight">{label}</label>
                      </div>
                      {url ? (
                        <div className="space-y-2">
                          <img src={url} alt={label} className="w-full h-28 object-cover rounded-lg" />
                          <Button variant="outline" size="sm" onClick={() => setter(null)} className="text-[10px] w-full h-7">
                            Cambiar
                          </Button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-orange-200 rounded-lg bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                          {uploadingStates[key] ? (
                            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
                          ) : (
                            <>
                              <Camera className="w-6 h-6 text-blue-400 mb-1" />
                              <span className="text-[10px] font-medium text-blue-600">Capturar</span>
                            </>
                          )}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, key)} />
                        </label>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                // Galería múltiple para fallas (hasta 10 fotos)
                <div>
                  <div className="mb-3">
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-orange-300 rounded-lg bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors">
                      {uploadingGaleria ? (
                        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-blue-400 mb-2" />
                          <span className="text-sm font-medium text-blue-600">
                            Agregar Fotos ({fotosGaleriaFalla.length}/10)
                          </span>
                          <span className="text-xs text-gray-600">Puedes seleccionar múltiples</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGaleriaFallaUpload}
                        disabled={fotosGaleriaFalla.length >= 10}
                      />
                    </label>
                  </div>

                  {fotosGaleriaFalla.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {fotosGaleriaFalla.map((url, index) => (
                        <div key={index} className="relative">
                          <img src={url} alt={`Evidencia ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                          <Button
                            size="sm"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 p-0"
                            onClick={() => setFotosGaleriaFalla(prev => prev.filter((_, i) => i !== index))}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isInstalacion && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      {[fotoPotenciaCaset, fotoPiFibra, fotoPfFibra, fotoNumeracionNap, fotoEtiquetaClienteNap, fotoPotenciaLiuk, fotoSerieEquipo, fotoPotenciaInterna, fotoContrasena, fotoTestVelocidad, fotoEsteticoEquipos, fotoTvPantalla].filter(Boolean).length} / 12 fotos completadas
                    </p>
                    {savedParcial && (
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Guardado
                      </span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleGuardarParcial}
                    disabled={savingParcial}
                    className="w-full h-10 border-orange-300 text-orange-700 hover:bg-orange-50 text-sm font-medium rounded-xl"
                  >
                    {savingParcial ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Guardar Fotos Parcialmente
                  </Button>
                </div>
              )}
              <Button
                onClick={() => setCurrentStep(isInstalacion ? 4 : 3)}
                className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl"
              >
                Continuar a Firma
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          )}

          {/* STEP 3/4: Firma y Cierre */}
          {((isInstalacion && currentStep === 4) || (!isInstalacion && currentStep === 3)) && (
            <Card className="p-5 rounded-xl shadow-sm bg-white space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <PenTool className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900">Firma y Cierre</h2>
              </div>

              {/* Observaciones */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Observaciones</label>
                <Textarea
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  placeholder="Escribe cualquier observación relevante..."
                  className="min-h-[80px] text-sm"
                />
              </div>

              {/* Firma */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-2">Firma del Cliente</label>
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={200}
                    className="w-full touch-none"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSignature}
                  className="mt-2 w-full text-xs"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Limpiar Firma
                </Button>
              </div>

              {/* Descargue de inventario para fallas. Mismo picker que en
                  instalaciones (paso 2), pero aqui vive en el cierre porque
                  la falla no tiene un paso intermedio. El stock se descuenta
                  en vivo al ir agregando items y se confirma al hacer
                  Finalizar — la API /api/inventario/descarga descuenta de
                  forma definitiva (serializados pasan a Instalado, los
                  miscelaneos restan del bucket de la cuadrilla). */}
              {!isInstalacion && (
                <DescargaMaterialesSection
                  cuadrillaId={cuadrillaId}
                  value={descargaItems}
                  onChange={setDescargaItems}
                />
              )}

              {/* Opciones para fallas */}
              {!isInstalacion && (
                <div className="space-y-3 pt-3 border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => setShowReprogramar(!showReprogramar)}
                    className="w-full"
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Cliente No Estaba - Reprogramar
                  </Button>

                  {showReprogramar && (
                    <div className="space-y-2 p-3 bg-yellow-50 rounded-lg">
                      <label className="text-xs font-semibold text-gray-700 block">Nueva Fecha Preferencia</label>
                      <Input
                        type="date"
                        value={nuevaFechaPreferencia}
                        onChange={(e) => setNuevaFechaPreferencia(e.target.value)}
                        className="text-sm"
                      />
                      <Button
                        onClick={handleReprogramar}
                        disabled={submitting || !nuevaFechaPreferencia}
                        className="w-full bg-yellow-600 hover:bg-yellow-700"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Confirmar Reprogramación
                      </Button>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={handleFinalizar}
                disabled={submitting || !hasSignature}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Finalizar y Cerrar
                  </>
                )}
              </Button>
            </Card>
          )}
        </div>
      </div>
    )
  }

  // Main agenda view
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-blue-50 pb-20">
      {/* Header */}
      <div className="bg-orange-600 text-white p-4 sticky top-0 z-10 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Agenda del Día</h1>
            <p className="text-xs opacity-90">{cuadrillaName}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMiInventario(true)}
              className="text-white hover:bg-orange-700"
              title="Mi Inventario"
            >
              <Warehouse className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Inventario</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCuadrillaId(null)
                setCuadrillaName("")
              }}
              className="text-white hover:bg-orange-700"
            >
              Cambiar Cuadrilla
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : tareas.length === 0 ? (
          <Card className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No hay tareas programadas para hoy</p>
          </Card>
        ) : (
          tareas.map((tarea) => {
            const isInstalacion = tarea.tipo === "instalacion"
            const estatus = isInstalacion 
              ? (tarea as InstalacionTecnico).estatus_instalacion 
              : (tarea as FallaTecnico).estatus_falla
            
            const estatusBadge = estatus === "programada" 
              ? "bg-blue-100 text-blue-700" 
              : "bg-yellow-100 text-yellow-700"

            return (
              <Card
                key={`${tarea.tipo}-${tarea.id}`}
                className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectTarea(tarea)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {isInstalacion ? (
                        <Home className="w-4 h-4 text-blue-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className="font-semibold text-gray-900">{tarea.nombre_completo}</span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-gray-700">Contrato:</span>
                        <span className="text-blue-600">#{tarea.contrato_id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {tarea.telefono}
                      </div>
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 mt-0.5" />
                        <span className="flex-1">{tarea.direccion}</span>
                      </div>
                      {tarea.latitud && tarea.longitud && (
                        <div>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${tarea.latitud},${tarea.longitud}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            <MapPin className="w-3 h-3" />
                            Ver ruta en Maps ({tarea.latitud.toFixed(6)}, {tarea.longitud.toFixed(6)})
                          </a>
                        </div>
                      )}
                      {!isInstalacion && (tarea as FallaTecnico).telefono_contacto_adicional && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-500">Contacto:</span>
                          {(tarea as FallaTecnico).telefono_contacto_adicional}
                        </div>
                      )}
                      {!isInstalacion && (
                        <div className="flex items-center gap-1 text-red-600 font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {(tarea as FallaTecnico).tipo_falla}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={estatusBadge}>
                      {estatus}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {tarea.bloque_horario}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <span className="text-xs text-gray-600">
                    <Wifi className="w-3 h-3 inline mr-1" />
                    {tarea.velocidad ? `${tarea.velocidad} - ${tarea.nombre_paquete}` : tarea.nombre_paquete}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleOpenReschedule(tarea, e)}
                      className="h-6 px-2 text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reagendar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => handleOpenReject(tarea, e)}
                      className="h-6 px-2 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      <Ban className="w-3 h-3 mr-1" />
                      Rechazar
                    </Button>
                    <span className="text-xs font-medium text-orange-600">
                      {isInstalacion ? "Instalación" : "Falla"}
                    </span>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Mi Inventario */}
      <MiInventarioDialog
        open={showMiInventario}
        onOpenChange={setShowMiInventario}
        cuadrillaId={cuadrillaId}
        cuadrillaName={cuadrillaName}
      />

      {/* Reschedule Modal */}
      {/* Reschedule Modal */}
      <Dialog open={showRescheduleModal} onOpenChange={(open) => { setShowRescheduleModal(open); if (!open) setRescheduleComentario("") }}>        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reagendar Tarea</DialogTitle>
          </DialogHeader>
          {tareaToReschedule && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900">{tareaToReschedule.nombre_completo}</p>
                <p className="text-xs text-gray-600">
                  {tareaToReschedule.tipo === "instalacion" ? "Instalación" : "Falla"} #{tareaToReschedule.id}
                </p>
                <p className="text-xs text-gray-600">Fecha actual: {tareaToReschedule.fecha_programada}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nueva Fecha</label>
                <Input
                  type="date"
                  value={nuevaFechaProgramada}
                  onChange={(e) => setNuevaFechaProgramada(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Comentarios</label>
                <textarea
                  value={rescheduleComentario}
                  onChange={(e) => setRescheduleComentario(e.target.value)}
                  placeholder="Motivo de la reprogramación (opcional)..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRescheduleModal(false)}
                  disabled={rescheduling}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmReschedule}
                  disabled={rescheduling || !nuevaFechaProgramada}
                >
                  {rescheduling ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Reagendando...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Modal */}
      <Dialog open={showRejectModal} onOpenChange={(open) => { setShowRejectModal(open); if (!open) setRejectComentario("") }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Rechazar Orden
            </DialogTitle>
          </DialogHeader>
          {tareaToReject && (
            <div className="space-y-4">
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-gray-900">{tareaToReject.nombre_completo}</p>
                <p className="text-xs text-gray-600">
                  {tareaToReject.tipo === "instalacion" ? "Instalación" : "Falla"} #{tareaToReject.id}
                </p>
              </div>
              <p className="text-sm text-gray-600">
                Esta acción marcará la orden como <span className="font-semibold text-red-600">rechazada</span>. ¿Deseas continuar?
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Motivo del rechazo</label>
                <textarea
                  value={rejectComentario}
                  onChange={(e) => setRejectComentario(e.target.value)}
                  placeholder="Describe el motivo del rechazo..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRejectModal(false)}
                  disabled={rejecting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmReject}
                  disabled={rejecting}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {rejecting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <Ban className="w-4 h-4 mr-2" />
                      Confirmar Rechazo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
