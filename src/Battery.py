import math

class Battery:
    """
    Class representing a battery in the simulation, it simulates the storage sistem of a house.
    """
    def __init__(self, capacity_kwh, efficiency, min_soc):
        """
        Initialize the battery with given parameters.

        args:
            capacity_kwh (float): The total capacity of the battery in kWh.
            efficiency (float): The efficiency of the battery (0 < efficiency <= 1).
            min_soc (float): Minimum SoC permitted (0-100)%.
        """
        self._capacity_kwh = capacity_kwh
        self._efficiency = efficiency
        self._min_soc = min_soc
        self._energy_kwh = capacity_kwh * 0.5 # Start at 50% SoC
        self._min_energy_kwh = capacity_kwh*(min_soc / 100)
        self._one_way_efficiency = math.sqrt(efficiency) # Efficiency for one direction (charge or discharge)

    def get_soc(self) -> float:
        """
        Get the current State of Charge (SoC) of the battery.

        returns:
            float: Current SoC as a percentage (0-100)%.
        """
        return (self._energy_kwh / self._capacity_kwh) * 100
    
    def is_full(self, threshold = 99.9) -> bool:
        """
        Check if battery is effectively full.
    
        Args:
            threshold (float): Percentage to consider "full" (default 99.9% to be a little flexible)
    
        Returns:
            bool: True if SoC >= threshold
        """
        return self.get_soc() >= threshold
    
    def is_empty(self) -> bool:
        """
        Check if battery is effectively empty.
    
        Returns:
            bool: True if SoC <= min_soc
        """
        return self.get_soc() <= self._min_soc
    
    def charge(self, energy_kwh) -> float:
        """
        Charge battery with given energy, accounting for efficiency losses.
    
        Args:
            energy_kwh (float): Energy to add in kWh
        
        Returns:
            float: Actual energy absorbed (may be less if battery gets full)
        """
        # Step 1: Calculate usable energy after efficiency losses
        usable_energy = energy_kwh * self._one_way_efficiency
    
        # Step 2: Calculate new energy without exceeding the limit
        new_energy = min(self._energy_kwh + usable_energy, self._capacity_kwh)
    
        # Step 3: Calculate actual absorbed energy
        absorbed = new_energy - self._energy_kwh
    
        # Step 4: Update battery energy
        self._energy_kwh = new_energy
    
        # Step 5: Return how much was absorbed
        return absorbed
    
    def discharge(self, energy_kwh) -> float:
        """
        Discharge battery by given energy, accounting for efficiency losses.

        Args:
            energy_kwh (float): Energy to remove in kWh

        Returns:
            float: Actual energy supplied (may be less if battery is low)
        """
        #Step 1: Calculate energy needed accounting for efficiency
        required_energy = energy_kwh / self._one_way_efficiency

        # Step 2: Calculate maximum available energy (respecting min_energy)
        max_available = self._energy_kwh - self._min_energy_kwh

        # Step 3: Calculate actual energy that can be supplied
        actual_extracted = min(required_energy, max_available)

        # Step 4: Update battery energy
        self._energy_kwh -= actual_extracted

        # Step 5: Calculate  actual energy supplied after efficiency losses
        supplied = actual_extracted * self._one_way_efficiency

        return supplied

     