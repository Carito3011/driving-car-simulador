import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ---------------- ESCENA ----------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 200, 8000);

// ---------------- CÁMARA ----------------
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 50000);

// ---------------- RENDER ----------------
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// ---------------- LUCES ----------------
scene.add(new THREE.AmbientLight(0xffffff,1.2));

const sun = new THREE.DirectionalLight(0xffffff,1.5);
sun.position.set(1000,2000,1000);
scene.add(sun);

// ---------------- VARIABLES ----------------
let car = null;
let city = null;
let speed = 0;
let rotation = 0;
let currentModel = "";

const keys = {};
const loader = new GLTFLoader();
const LIMIT = 20000;

// ---------------- RAYCAST ----------------
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

// ---------------- ESCALA AUTO ----------------
function escalarModelo(obj) {
    const box = new THREE.Box3().setFromObject(obj);
    const size = new THREE.Vector3();
    box.getSize(size);

    const desired = 7;
    const factor = desired / Math.max(size.x, size.y, size.z);

    obj.scale.setScalar(factor);
}

// ---------------- CARGAR CARRO ----------------
window.cargarCarro = function(n){
    document.getElementById('loading').style.display='flex';

    loader.load('./'+n,(gltf)=>{
        if(car) scene.remove(car);

        car = gltf.scene;
        currentModel = n;

        escalarModelo(car);
        car.position.set(0, 10, 0);

        scene.add(car);

        speed = 0;
        rotation = 0;

        document.getElementById('loading').style.display='none';
    });
};

// ---------------- CARGAR CIUDAD ----------------
loader.load('./city.glb', (gltf) => {
    city = gltf.scene;

    city.scale.set(100,100,100);
    scene.add(city);

    const box = new THREE.Box3().setFromObject(city);
    const center = new THREE.Vector3();

    box.getCenter(center);

    city.position.x -= center.x;
    city.position.z -= center.z;
    city.position.y -= box.min.y;

    cargarCarro('BMW.glb');
});

// ---------------- CAMBIO ----------------
window.addEventListener('cambiarCarro', e => cargarCarro(e.detail));

// ---------------- UPDATE ----------------
function update(){
    if(!car || !city) return;

    // -------- VELOCIDAD --------
    let acc = 0.4, max = 35;

    if(currentModel==='BMW.glb'){ acc=0.010; max=5; }
    if(currentModel==='Lamborghini.glb'){ acc=0.023; max=5; }
    if(currentModel==='Buggati.glb'){ acc=0.023; max=5; }

    if(keys['w']) speed += acc;
    else if(keys['s']) speed -= 0.023;
    else speed *= 0.95;

    // -------- FRENO --------
    if(keys[' ']) speed *= 0.7;

    speed = THREE.MathUtils.clamp(speed, -50, max);

    // -------- GIRO --------
    if(Math.abs(speed) > 0.1){
        let dir = speed > 0 ? 1 : -1;

        if(keys['a']) rotation += 0.04 * dir;
        if(keys['d']) rotation -= 0.04 * dir;
    }

    car.rotation.y = rotation;

    const prev = car.position.clone();
    car.translateZ(speed);

    // -------- LÍMITES --------
    if(Math.abs(car.position.x) > LIMIT || Math.abs(car.position.z) > LIMIT){
        car.position.copy(prev);
        speed = 0;
    }

    // -------- COLISIÓN FRONTAL --------
    const forward = new THREE.Vector3(0,0,-1).applyQuaternion(car.quaternion);

    raycaster.set(car.position, forward);
    raycaster.far = 4;

    const frontal = raycaster.intersectObject(city, true);

    if(frontal.length > 0){
        car.position.copy(prev);
        speed *= 0.3;
    }

    // -------- RAYCAST SUELO --------
    raycaster.set(
        car.position.clone().add(new THREE.Vector3(0, 20, 0)),
        down
    );

    raycaster.far = 100;

    const hits = raycaster.intersectObject(city, true);

    let suelo = false;

    for(let hit of hits){
        if(hit.face && hit.face.normal.y > 0.5){
            const targetY = hit.point.y + 2;
            car.position.y += (targetY - car.position.y) * 0.25;
            suelo = true;
            break;
        }
    }

    if(!suelo){
        car.position.y = 5;
    }

    // -------- HUD --------
    document.getElementById('kmh').innerText =
        Math.floor(Math.abs(speed) * 50);

    // -------- CÁMARA --------
    const offset = new THREE.Vector3(0, 7.8, -17);
    offset.applyQuaternion(car.quaternion);

    const target = car.position.clone().add(offset);

    camera.position.lerp(target, 0.4);

    camera.lookAt(
        car.position.x,
        car.position.y + 3,
        car.position.z
    );
}

// ---------------- LOOP ----------------
function animate(){
    requestAnimationFrame(animate);
    update();
    renderer.render(scene,camera);
}
animate();

// ---------------- INPUT ----------------
addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// ---------------- RESIZE ----------------
addEventListener('resize', ()=>{
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
});
window.resetCar = function(){
    if(!car) return;

    // posición inicial
    car.position.set(0, 10, 0);

    // rotación
    car.rotation.y = 0;

    // velocidad
    speed = 0;

    // cámara se ajusta instantáneamente
    camera.position.set(0, 20, -30);
}
let musicaIniciada = false;

window.addEventListener('keydown', () => {
    if(!musicaIniciada){
        const audio = document.getElementById('musica');
        audio.volume = 0.5; // volumen
        audio.play();
        musicaIniciada = true;
    }
});
// Seleccionamos el audio
const musica = document.getElementById('musica-fondo');

// Al hacer el primer clic en cualquier parte de la pantalla...
window.addEventListener('click', () => {
    // Si la música no está sonando, la iniciamos
    if (musica.paused) {
        musica.play().catch(error => {
            console.log("Error al reproducir:", error);
        });
        console.log("Reproduciendo: Dios no está muerto (Pixabay version)");
    }
}, { once: true }); // 'once: true' hace que este evento solo ocurra una vez
