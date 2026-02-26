import streamlit as st
import pandas as pd # <--- Corregido aquí
from datetime import datetime
import random
import google.generativeai as genai
from pypdf import PdfReader 
import gspread
from google.oauth2.service_account import Credentials
import json
st.markdown("""
    <style>
    /* Hace que las pestañas se vean grandes y claras en el móvil */
    .stTabs [data-baseweb="tab-list"] button {
        font-size: 18px !important;
        font-weight: bold !important;
        color: white !important;
    }
    /* Resalta la pestaña que tienes seleccionada */
    .stTabs [aria-selected="true"] {
        background-color: #4A90E2 !important;
        border-radius: 5px;
    }
    </style>
""", unsafe_allow_html=True)
# 1. CONFIGURACIÓN E INICIALIZACIÓN
st.set_page_config(page_title="CAMPUS Ernest", layout="wide")
# --- FUNCIÓN PARA CONECTAR CON GOOGLE SHEETS ---
def cargar_usuarios_desde_db():
    try:
        # Extraemos la llave que pegaste en Secrets (la que minificamos)
        import json
        info_llave = st.secrets["gspread_json"]["clave"]
        cred_dict = json.loads(info_llave)
        
        # Añadimos los dos permisos: Sheets y Drive
        scope = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
        creds = Credentials.from_service_account_info(cred_dict, scopes=scope)
        cliente = gspread.authorize(creds)
        
        # Abrimos tu Excel y la pestaña 'usuarios'
        libro = cliente.open("BD_Campus_CaniCiencia")
        hoja = libro.worksheet("usuarios")
        
        datos = hoja.get_all_records()
        # Transformamos las filas del Excel al formato de la app
        return {str(f["Usuario"]): {"password": str(f["Password"]), "rol": f["Rol"]} for f in datos}
    except Exception as e:
        st.error(f"Error en base de datos: {e}")
        # Si falla, te deja entrar a ti como admin por seguridad
        return {"ernest": {"password": "cani2026", "rol": "admin"}}

# --- CARGA INICIAL (ESTO ES VITAL) ---
if "usuarios" not in st.session_state:
    st.session_state["usuarios"] = cargar_usuarios_desde_db()

# --- BOTÓN DE SINCRONIZACIÓN (Solo para ti) ---
if st.session_state.get("rol") == "admin":
    if st.sidebar.button("🔄 Sincronizar Alumnos"):
        st.session_state["usuarios"] = cargar_usuarios_desde_db()
        st.sidebar.success("¡Datos actualizados!")
        st.rerun()
if "asignaturas_data" not in st.session_state:
    st.session_state["asignaturas_data"] = {
        "Etología Canina": {"doc_name": None, "doc_text": "", "modo": "Dual"},
        "Técnica de Clicker": {"doc_name": None, "doc_text": "", "modo": "Dual"},
        "Aromaterapia": {"doc_name": None, "doc_text": "", "modo": "Dual"},
        "Gestión de Miedos": {"doc_name": None, "doc_text": "", "modo": "Dual"}
    }

if "db_actividad" not in st.session_state:
    st.session_state["db_actividad"] = []

if "api_key_pers" not in st.session_state:
    st.session_state["api_key_pers"] = ""

# 2. BARRA LATERAL
with st.sidebar:
    st.header("🐾 Panel de Control")
    
    # Intentamos leer de los Secrets primero
    secret_key = st.secrets.get("GEMINI_API_KEY", "")
    
    # Si hay secreto, lo usamos y ocultamos el input
    if secret_key:
        st.session_state["api_key_pers"] = secret_key
        chat_model = None
        try:
            genai.configure(api_key=secret_key)
            # ... resto de la lógica de conexión ...
            available_models = [m.name for m in genai.list_models() if 'generateContent' in m.supported_generation_methods]
            nombre_final = next((m for m in available_models if "1.5-flash" in m), available_models[0])
            chat_model = genai.GenerativeModel(nombre_final)
            st.success("IA Conectada ✅")
        except:
            st.error("Error con la clave de los Secrets")
    else:
        # Si NO hay secreto, mostramos el cuadro (solo para ti en local)
        api_input = st.text_input("Gemini API Key:", type="password")
        if api_input:
            st.session_state["api_key_pers"] = api_input

    if "user" in st.session_state:
        u_info = st.session_state["usuarios"][st.session_state["user"]]
        if u_info["rol"] == "Alumno":
            st.subheader("⚙️ Ajustes de Estudio")
            modo = st.radio("Ruta:", ["Oficial", "IA Libre", "PDF Propio"])
            materias_keys = list(st.session_state["asignaturas_data"].keys())
            if modo == "Oficial":
                if materias_keys:
                    tema_sel = st.selectbox("Materia:", materias_keys, key=f"sb_{len(materias_keys)}")
                    sub_sel = st.text_input("Subtema del examen:", placeholder="Ej: Cítricos")
                    st.session_state["tema_estudio"] = tema_sel
                    st.session_state["subtema_estudio"] = sub_sel
                else: st.warning("Configura materias como Admin")
            elif modo == "IA Libre":
                st.session_state["tema_estudio"] = st.text_input("Investigación:")
                st.session_state["subtema_estudio"] = st.text_input("Subtema:")
            else:
                st.session_state["tema_estudio"] = "PDF Externo"
                st.file_uploader("Sube tu archivo")

        st.divider()
        if st.button("Reiniciar todo y Salir"):
            del st.session_state["user"]
            st.rerun()

# 3. ESTILO
st.markdown("<style>.stApp { background-color: #000000; color: #FFFFFF; } .stButton > button { background-color: #00FF00 !important; color: #000000 !important; font-weight: bold; }</style>", unsafe_allow_html=True)

# 4. LÓGICA DE ACCESO
if "user" not in st.session_state:
    st.title("Campus CaniCiencia")
    u = st.text_input("Usuario:").lower()
    p = st.text_input("Contraseña:", type="password")
    if st.button("ENTRAR"):
        if u in st.session_state["usuarios"] and st.session_state["usuarios"][u]["password"] == p:
            st.session_state["user"] = u
            st.rerun()
        else: st.error("Credenciales incorrectas")
else:
   u_actual = st.session_state.get("usuario", "ernest")
        u_info = st.session_state["usuarios"].get(u_actual, {"rol": "admin"})
        
        if u_info["rol"].strip().lower() == "admin":
            st.info(f"Sesión iniciada como: {u_actual} (ADMIN)")
            t1, t2, t3 = st.tabs(["📊 EXPEDIENTES", "👥 USUARIOS", "📖 MATERIAS"])
			        
		   with t1:
		   if st.session_state.get("db_actividad"):
			                st.subheader("Registros de Actividad")
			                st.dataframe(st.session_state["db_actividad"])
			            else:
			                st.write("No hay actividad registrada aún.")
			
			        with t2:
			            st.subheader("👥 Gestión de Alumnos")
			            
			            with st.expander("➕ Registrar Nuevo Alumno"):
			                c1, c2 = st.columns(2)
			                with c1:
			                    nuevo_u = st.text_input("Nombre de Usuario", key="n_u")
			                with c2:
			                    nueva_p = st.text_input("Contraseña", type="password", key="n_p")
			                
			                if st.button("Guardar Alumno"):
			                    if nuevo_u and nueva_p:
			                        try:
			                            import gspread
			                            from google.oauth2.service_account import Credentials
			                            info_llave = st.secrets["gspread_json"]["clave"]
			                            cred_dict = json.loads(info_llave)
			                            scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
			                            creds = Credentials.from_service_account_info(cred_dict, scopes=scope)
			                            cliente = gspread.authorize(creds)
			                            hoja = cliente.open("BD_Campus_CaniCiencia").worksheet("usuarios")
			                            hoja.append_row([nuevo_u, nueva_p, "alumno"])
			                            st.success(f"Alumno {nuevo_u} registrado con éxito")
			                            st.rerun()
			                        except Exception as e:
			                            st.error(f"Error al guardar: {e}")
			                    else:
			                        st.warning("Rellena ambos campos")
			
			            st.divider()
			
			            for usuario, info in st.session_state["usuarios"].items():
			                if info["rol"].lower() == "alumno":
			                    c1, c2, c3 = st.columns([2, 2, 1])
			                    with c1:
			                        st.write(f"👤 **{usuario}**")
			                    with c2:
			                        st.write(f"🔑 {info['password']}")
			                    with c3:
			                        if st.button("🗑️", key=f"del_{usuario}"):
			                            try:
			                                import gspread
			                                from google.oauth2.service_account import Credentials
			                                info_llave = st.secrets["gspread_json"]["clave"]
			                                cred_dict = json.loads(info_llave)
			                                scope = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"]
			                                creds = Credentials.from_service_account_info(cred_dict, scopes=scope)
			                                cliente = gspread.authorize(creds)
			                                hoja = cliente.open("BD_Campus_CaniCiencia").worksheet("usuarios")
			                                celda = hoja.find(usuario)
			                                hoja.delete_rows(celda.row)
			                                st.warning(f"Eliminado {usuario}")
			                                st.rerun()
			                            except:
			                                st.error("No se pudo borrar")
			
			        with t3:
			            st.subheader("📖 Gestión de Materias")
			            st.info("Configura aquí los materiales de estudio.")
			            # Este bloque es expansible para cada materia
			            materias = ["Materia 1", "Materia 2", "Materia 3"]
			            for m in materias:
			                with st.expander(f"📚 {m}"):
			                    st.file_uploader(f"Actualizar PDF de {m}", type="pdf", key=f"subir_{m}")
# --- VISTA ALUMNO (ESTUDIO, EXÁMENES Y TUTOR) ---
    else:
        st.title(f"👋 ¡Hola, {st.session_state.get('usuario', 'Alumno')}!")
        
        t_a1, t_a2, t_a3 = st.tabs(["📚 ESTUDIO OFICIAL", "📝 EXÁMENES", "🤖 TUTOR LIBRE"])
        
        with t_a1:
            st.subheader("📖 Estudio Estricto (Sin IA)")
            st.info("Aquí estudias el material oficial de forma tradicional.")
            asig_estudio = st.selectbox("Selecciona Materia para estudiar", ["Etología", "Clicker", "Aromaterapia"])
            # Lógica para visualizar el PDF oficial sin chat
            st.write(f"Visualizando material oficial de: {asig_estudio}")
            # [Aquí va el código del iframe/pdf que ya tenías]

        with t_a2:
            st.subheader("✍️ Centro de Evaluación")
            tema_examen = st.text_input("Subtema del examen (ej: Refuerzo positivo)")
            if st.button("Generar Examen"):
                st.write(f"Generando examen de {tema_examen}...")
                # Aquí la IA genera las preguntas y luego las corrige/valora
            
        with t_a3:
            st.subheader("🤖 Tutor IA (Tema Libre)")
            st.write("Sube cualquier PDF para analizarlo con la IA o haz preguntas libres.")
            pdf_libre = st.file_uploader("Subir PDF extra", type="pdf", key="libre")
            if prompt := st.chat_input("Pregunta lo que quieras a tu tutor..."):
                st.chat_message("user").write(prompt)
                # Aquí la IA responde usando el PDF extra o su conocimiento











