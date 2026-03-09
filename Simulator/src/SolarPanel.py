import math

class SolarPanel:
    """
    Simulates solar panel energy generation based on time and weather.

    UPDATE:
    - Now we soport multiple panels with total_panels
    - Creation of the function generate_for_panels() to calculate generation for multiple panels
    """
    
    def __init__(self, peak_power_kw, total_panels=1):
        """
        Initialize solar panel system.
        
        Args:
            peak_power_kw (float): Maximum generation capacity in kW
            total_panels (int): Total number of panels
        """
        self._peak_power_kw = peak_power_kw
        self._total_panels = total_panels
    
    def generate(self, hour_of_day, cloud_coverage=0.0):
        """
        Calculate solar generation for given conditions.
        
        Args:
            hour_of_day (float): Hour of day (0-24, can be fractional)
            cloud_coverage (float): Cloud coverage factor (0-1, 0=clear, 1=overcast)
            
        Returns:
            float: Generated power in kW
        """
        # 1. If hour_of_day < 6 or hour_of_day >= 18: return 0.0
        if hour_of_day < 6 or hour_of_day >= 18:
            return 0.0
        
        # 2. Calculate hours_since_sunrise 
        hours_since_sunrise = hour_of_day - 6
        
        # 3. Calculate sun_angle
        sun_angle = hours_since_sunrise * (math.pi / 12)
        
        # 4. Calculate base_generation 
        base_generation = self._peak_power_kw * math.sin(sun_angle)
        
        # 5. Apply clouds
        actual_generation = base_generation * (1 - cloud_coverage)
        
        # 6. Return actual_generation
        return actual_generation
    
    def generate_for_panels(self, n_panels, hour_of_day, cloud_coverage=0.0):
        """
        Calculate solar generation for a subset of panels.

        It is only use when panels are distributed for a subset of panels

        Args:
            n_panels(int): Number of panels connected to an inverter
            hour_of_day (float): Hour of day(0-24, can be fractional)
            cloud_coverage (float): Cloud coverage factor (0-1, 0=clear, 1=overcast)

        Returns:
            float: Generated power in kW for n_panels
        """
        #Avoid hours without sun
        if hour_of_day < 6 or hour_of_day >= 18:
            return 0.0
        
        #Calculate hours since sunrise and sun angle
        hours_since_sunrise = hour_of_day - 6
        sun_angle =  hours_since_sunrise * (math.pi / 12)

        #Generation for the n_panels
        subset_peak_power_kw = self._peak_power_kw * n_panels
        base_generation = subset_peak_power_kw * math.sin(sun_angle)
        actual_generation = base_generation * (1 - cloud_coverage)

        return actual_generation

        

