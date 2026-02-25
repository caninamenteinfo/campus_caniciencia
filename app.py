import streamlit as st
import pandas as pd # <--- Corregido aquí
from datetime import datetime
import random
import google.generativeai as genai
from pypdf import PdfReader 
import gspread
from google.oauth2.service_account import Credentials
import json

# 1. CONFIGURACIÓN E INICIALIZACIÓN
st.set_page_config(page_title="CaniCiencia PRO", layout="wide")
# --- FUNCIÓN PARA CONECTAR CON GOOGLE SHEETS ---
def cargar_usuarios_desde_db():
    try:
        # Extraemos la llave que pegaste en Secrets (la que minificamos)
        import json
        info_llave = st.secrets["gspread_json"]["clave"]
        cred_dict = json.loads(info_llave)
        
        scope = ["https://www.googleapis.com/auth/spreadsheets"]
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

# Cargamos los usuarios reales del Excel al iniciar la sesión
if "usuarios" not in st.session_state:
    st.session_state["usuarios"] = cargar_usuarios_desde_db()

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
        if u in st.session_state["usuarios"] and st.session_state["usuarios"][u]["pass"] == p:
            st.session_state["user"] = u
            st.rerun()
        else: st.error("Credenciales incorrectas")
else:
    u_info = st.session_state["usuarios"][st.session_state["user"]]

    # --- VISTA ADMIN ---
    if u_info["rol"] == "Admin":
        st.title("🚀 Panel Docente")
        t1, t2, t3 = st.tabs(["📊 EXPEDIENTES", "👥 USUARIOS", "📖 MATERIAS"])
        with t1:
            if st.session_state["db_actividad"]:
                st.dataframe(pd.DataFrame(st.session_state["db_actividad"]), use_container_width=True, hide_index=True)
        with t2:
            st.table(pd.DataFrame([{"User": k, "Pass": v["pass"]} for k,v in st.session_state["usuarios"].items()]))
            nu = st.text_input("Usuario:").lower(); np = st.text_input("Clave:")
            if st.button("Actualizar"):
                if nu and np: st.session_state["usuarios"][nu] = {"rol": "Alumno", "pass": np}; st.rerun()
        with t3:
            for asig in list(st.session_state["asignaturas_data"].keys()):
                data = st.session_state["asignaturas_data"][asig]
                with st.expander(f"📖 {asig}"):
                    c1, c2 = st.columns([2, 1])
                    with c1:
                        f = st.file_uploader(f"PDF para {asig}", type=["pdf", "txt"], key=f"f_{asig}")
                        if f:
                            if f.type == "application/pdf":
                                reader = PdfReader(f)
                                text = "".join([p.extract_text() + "\n" for p in reader.pages])
                            else: text = f.read().decode("utf-8")
                            st.session_state["asignaturas_data"][asig]["doc_name"] = f.name
                            st.session_state["asignaturas_data"][asig]["doc_text"] = text
                            st.success("Guardado.")
                    with c2:
                        st.session_state["asignaturas_data"][asig]["modo"] = st.radio("Modo:", ["Estricto", "Dual"], key=f"m_{asig}")
                    if st.button(f"Borrar {asig}", key=f"del_{asig}"):
                        del st.session_state["asignaturas_data"][asig]; st.rerun()
            na = st.text_input("Nueva Materia:")
            if st.button("Añadir"):
                if na: st.session_state["asignaturas_data"][na] = {"doc_name": None, "doc_text": "", "modo": "Dual"}; st.rerun()

    # --- VISTA ALUMNO ---
    else:
        tema = st.session_state.get("tema_estudio", "General")
        subtema = st.session_state.get("subtema_estudio", "")
        info_mat = st.session_state["asignaturas_data"].get(tema, {"doc_name": None, "doc_text": "", "modo": "Dual"})
        
        contexto_tutor = f"DOC OFICIAL: {info_mat['doc_text']}. " if info_mat['doc_text'] else ""
        if info_mat['modo'] == "Estricto":
            contexto_tutor += "SOLO RESPONDE BASÁNDOTE EN EL DOC. No inventes."

        st.title(f"🎓 Alumno: {st.session_state['user'].upper()}")
        st.caption(f"Materia: {tema} | Subtema: {subtema}")

        # TUTORÍA
        st.subheader("📚 Tutoría IA")
        if st.button("Reiniciar", key="reset_t"):
            if "res_tutor" in st.session_state: del st.session_state["res_tutor"]
            st.rerun()
        duda = st.text_input("Duda técnica:")
        if st.button("🚀 PREGUNTAR"):
            if chat_model and duda:
                res = chat_model.generate_content(f"{contexto_tutor}\n\nPregunta: {duda}")
                st.session_state["res_tutor"] = res.text
        if "res_tutor" in st.session_state: st.info(st.session_state["res_tutor"])

        st.divider()
        # TEST 1-2-3
        st.subheader("📝 Test de Evaluación")
        if st.button("Reset", key="reset_e"):
            st.session_state["ex_on"] = False; st.rerun()
        
        if st.button("📄 GENERAR TEST"):
            if chat_model:
                with st.spinner("Generando..."):
                    st.session_state["ex_id"] = random.randint(1, 9999)
                    p_test = f"{contexto_tutor}\nGenera 10 preguntas con opciones 1, 2 y 3 sobre {subtema}. Separa con '###'."
                    res_ex = chat_model.generate_content(p_test)
                    st.session_state["ex_preg"] = [p.strip() for p in res_ex.text.split("###") if len(p.strip()) > 15][:10]
                    st.session_state["ex_on"] = True

        if st.session_state.get("ex_on"):
            resp_usuario = []
            for i, p_txt in enumerate(st.session_state["ex_preg"]):
                st.markdown(p_txt)
                r = st.radio(f"P{i+1}:", ["1", "2", "3"], index=None, key=f"q_{st.session_state['ex_id']}_{i}", horizontal=True)
                resp_usuario.append(r)
                st.write("---")
            
            if st.button("Finalizar y Calificar"):
                with st.spinner("Calculando nota..."):
                    prompt_calif = f"""
                    TEMARIO: {info_mat['doc_text']}
                    PREGUNTAS GENERADAS: {st.session_state['ex_preg']}
                    RESPUESTAS MARCADAS POR EL ALUMNO: {resp_usuario}
                    
                    TAREA: Califica rigurosamente del 0 al 10. 
                    - CADA PREGUNTA VALE 1 PUNTO.
                    - SI UNA RESPUESTA ES 'None', VALE 0 PUNTOS.
                    - SI LA RESPUESTA NO COINCIDE CON LA OPCIÓN CORRECTA DEL TEMARIO, VALE 0 PUNTOS.
                    - SE EXTREMADAMENTE ESTRICTO. SI NO HAY RESPUESTAS, LA NOTA FINAL ES 0.
                    Explica pregunta por pregunta.
                    """
                    calif_res = chat_model.generate_content(prompt_calif)
                    st.success(calif_res.text)
                    st.session_state["db_actividad"].append({"Fecha": datetime.now().strftime("%d/%m %H:%M"), "Alumno": st.session_state["user"], "Asignatura": f"{tema} ({subtema})", "Actividad": "Test", "Resultado": calif_res.text})
                    st.session_state["ex_on"] = False


