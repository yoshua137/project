# Ver Ofertas de Pasantía (Student)

## Descripción
Este componente permite a los estudiantes ver todas las ofertas de pasantía disponibles y buscar entre ellas.

## Funcionalidades

### Búsqueda y Filtros
- **Búsqueda por texto**: Permite buscar por título, descripción, carrera u organización
- **Filtro por carrera**: Dropdown para filtrar por carrera específica
- **Búsqueda en tiempo real**: Los resultados se filtran automáticamente mientras el usuario escribe
- **Búsqueda insensible a mayúsculas**: No distingue entre mayúsculas y minúsculas
- **Filtros combinados**: Se pueden usar búsqueda por texto y filtro por carrera simultáneamente

### Campos de Búsqueda
- **Título**: Busca en el título de la oferta
- **Descripción**: Busca en la descripción de la oferta
- **Carrera**: Busca en el campo de carrera
- **Organización**: Busca en el nombre de la organización

### Filtros Disponibles
- **Carrera**: Filtro dropdown con todas las carreras disponibles
- **Todas las carreras**: Opción para mostrar ofertas de todas las carreras

### UI/UX
- **Diseño responsivo**: Funciona en dispositivos móviles y desktop
- **Estados visuales**: Loading, error y sin resultados
- **Botón limpiar**: Permite limpiar todos los filtros rápidamente
- **Contador de resultados**: Muestra cuántas ofertas se encontraron
- **Información de filtros**: Indica qué filtros están aplicados

## Cambios Realizados

### Antes
- Solo filtro por carrera (dropdown)
- Funcionalidad limitada de búsqueda

### Después
- Búsqueda por texto completo
- Filtro por carrera (dropdown)
- Combinación de ambos filtros
- Mejor experiencia de usuario
- Consistencia con el diseño de "Mis Ofertas de Pasantía"

## Estructura de Datos
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
  contactEmail: string;
  contactPhone: string;
}
```

## Rutas
- **Frontend**: `/ver-ofertas-pasantia`
- **Backend**: `/api/InternshipOffer`

## Autorización
- Política: `claimReq.studentInternshipOffers`
- Rol requerido: "Student" 