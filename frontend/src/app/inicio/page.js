"use client"
import {useState, useEffect} from "react";
import styles from"./Home.module.css"


export default function Home() {
    const [alumno, setAlumno] = useState("");
    const[mostrarAyuda,setMostrarAyuda] = useState(false);
    useEffect(()=>{
        document.title = "Pio Promedios - Inicio";
    },[]);
    useEffect(()=>{
        console.log("El alumno cambio a: ", alumno);
    },[alumno]);
    const handleChange = (event) => {
        setAlumno(event.target.value);
    };
  return (
      <div className={styles.pagina}>
        <div className={styles.columna}>
            <input type="text" className={styles.input} value={alumno} onChange={handleChange} placeholder="Ingresá tu nombre"></input>
        </div>
        {alumno === ""?(
           <p className={styles.mensaje}> Por favor, ingresá tu nombre</p> 
        ) : (
            <div className={styles.bienvenida}>
                <p>¡Hola!, {alumno}</p>
                <p>Para ir al calculador de notas escribí: http://localhost:3000/notas</p>
            </div>
        )}
        
        <button className={styles.boton} onClick={()=> setMostrarAyuda(!mostrarAyuda)}>Mostrar/Ocultar ayuda</button>

        {mostrarAyuda &&(
            <ul className={styles.ayuda}>
                <li>Ingresá tu nombre para empezar </li>
                <li>Andá a /notas para carar tus notas</li>
                <li>Son notas del 0 al 10</li>
                <li>Podes eliminar cualquier nota de la lista</li>
                <li>El promedio se calcula automatico</li>
            </ul>
        )}



      </div>
  );
}