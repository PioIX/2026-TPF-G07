"use client"
import { useSocket } from "@/hooks/useSocket";
import { useEffect, useState } from "react";


export default function SocketPage(){
    const {socket, isConnected} = useSocket();
    const [mensaje, setMensaje] = useState([]);
    const [contador, setContador] = useState(0);

    
    function pingAll(){
        if(socket){
            socket.emit("pingAll",{msg:"Hola"});
        }
        
    }

    function emitirEvento(){
        socket.emit("eventoPersonalizado");
    }

    useEffect(()=>{
        if(!socket) return;
            
        console.log("Socket disponible", socket)


        socket.on("pingAll", (data) =>{
            console.log(data)
            setMensaje((prev) =>[... prev, data.message.msg]);
        });

        socket.on("respuestaPersonalizada",(data) =>{
            setContador(data.contador); 
        })

    },[socket]);

    return(
        <>
            <div>
                {isConnected ?(
                    <p>🟢 Conectado al servidor</p>

                ) :(
                    <p>🔴 Desconectado</p>
                )}

                <button onClick={pingAll} disabled={!isConnected}>Enviar ping</button>

                <ul>
                    {mensaje && mensaje.map((item,index) =>(
                        <li key={index}> {typeof item === "object" && item !== null ? item.msg || JSON.stringify(item):item} </li>
                    ))}

                </ul>

                <button onClick={emitirEvento} disabled={!isConnected}> Contar +1</button>

                <p> Contador = {contador}</p>
            </div>
            
        
        
        </>

    );

    
}