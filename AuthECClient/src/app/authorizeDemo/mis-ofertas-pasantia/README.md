# Mis Ofertas de Pasantía

## Descripción
Este componente permite a las organizaciones ver y gestionar todas sus ofertas de pasantía publicadas.

## Funcionalidades

### Backend (API)
- **GET** `/api/InternshipOffer/my-offers` - Obtiene todas las ofertas de pasantía de la organización autenticada
- **DELETE** `/api/InternshipOffer/{id}` - Elimina una oferta de pasantía específica

### Frontend (Angular)
- **Visualización**: Muestra todas las ofertas en un diseño de tarjetas responsivo
- **Filtros**: Búsqueda por texto y filtro por carrera
- **Estados**: Indica si la oferta está activa, próxima o finalizada
- **Acciones**: Permite eliminar ofertas con confirmación
- **Responsivo**: Diseño adaptativo para diferentes tamaños de pantalla

## Características Técnicas

### Seguridad
- Solo usuarios con rol "Organization" pueden acceder
- Las ofertas se filtran automáticamente por el ID de la organización del usuario autenticado
- Validación de permisos para eliminar ofertas

### UI/UX
- Diseño moderno con Tailwind CSS
- Estados de carga y error
- Animaciones suaves
- Iconos descriptivos
- Información completa de cada oferta

### Estructura de Datos
```typescript
interface InternshipOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  startDate: string;
  endDate: string;
  organizationId: string;
  organizationName: string;
  mode: string;
  career: string;
  contactEmail?: string;
  contactPhone?: string;
}
```

## Rutas
- **Frontend**: `/mis-ofertas-pasantia`
- **Backend**: `/api/InternshipOffer/my-offers`

## Autorización
- Política: `claimReq.organizationInternshipOffer`
- Rol requerido: "Organization" 