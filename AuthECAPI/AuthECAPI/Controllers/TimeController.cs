using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using AuthECAPI.Services;

namespace AuthECAPI.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TimeController : ControllerBase
    {
        private readonly ICloudTimeService _cloudTimeService;

        public TimeController(ICloudTimeService cloudTimeService)
        {
            _cloudTimeService = cloudTimeService;
        }

        /// <summary>
        /// Sincroniza la hora del sistema con la hora de la nube
        /// </summary>
        /// <returns>Información sobre la sincronización</returns>
        [HttpPost("sync")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> SyncTime()
        {
            try
            {
                var cloudTime = await _cloudTimeService.GetCloudTimeAsync();
                await _cloudTimeService.SyncWithCloudAsync();
                var systemTime = _cloudTimeService.Now;

                return Ok(new
                {
                    success = true,
                    cloudTime = cloudTime,
                    systemTime = systemTime,
                    message = "Hora sincronizada exitosamente con la nube"
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    success = false,
                    message = $"Error al sincronizar la hora: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Obtiene la hora actual del sistema (sincronizada con la nube)
        /// </summary>
        [HttpGet("now")]
        [AllowAnonymous]
        public ActionResult<object> GetCurrentTime()
        {
            try
            {
                return Ok(new
                {
                    currentTime = _cloudTimeService.Now,
                    today = _cloudTimeService.Today
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = $"Error al obtener la hora: {ex.Message}"
                });
            }
        }

        /// <summary>
        /// Obtiene la hora de la nube directamente
        /// </summary>
        [HttpGet("cloud")]
        [AllowAnonymous]
        public async Task<ActionResult<object>> GetCloudTime()
        {
            try
            {
                var cloudTime = await _cloudTimeService.GetCloudTimeAsync();
                return Ok(new
                {
                    cloudTime = cloudTime
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = $"Error al obtener la hora de la nube: {ex.Message}"
                });
            }
        }
    }
}

