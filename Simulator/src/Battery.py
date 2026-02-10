import math

class Battery:
    """
    Battery storage system with realistic efficiency losses.
    
    CORRECTED VERSION:
    - charge() now returns energy CONSUMED from source (not stored)
    - This ensures efficiency losses are properly accounted for
    - Rejected energy is ONLY due to capacity limits (not efficiency)
    """
    
    def __init__(self, capacity_kwh, efficiency, min_soc):
        """
        Initialize the battery with given parameters.

        Args:
            capacity_kwh (float): The total capacity of the battery in kWh.
            efficiency (float): Round-trip efficiency (0 < efficiency <= 1).
            min_soc (float): Minimum State of Charge permitted (0-1 as decimal).
        """
        self._capacity_kwh = capacity_kwh
        self._efficiency = efficiency
        self._min_soc = min_soc
        self._energy_kwh = capacity_kwh * 0.5  # Start at 50% SoC
        self._min_energy_kwh = capacity_kwh * min_soc
        self._one_way_efficiency = math.sqrt(efficiency)  # One-way efficiency

    def get_soc(self) -> float:
        """
        Get the current State of Charge (SoC) of the battery.

        Returns:
            float: Current SoC as a percentage (0-100)%.
        """
        return (self._energy_kwh / self._capacity_kwh) * 100
    
    def is_full(self, threshold=99.9) -> bool:
        """
        Check if battery is effectively full.
    
        Args:
            threshold (float): Percentage to consider "full" (default 99.9%)
    
        Returns:
            bool: True if SoC >= threshold
        """
        return self.get_soc() >= threshold
    
    def is_empty(self) -> bool:
        """
        Check if battery is at minimum SoC.
    
        Returns:
            bool: True if SoC <= min_soc
        """
        return self._energy_kwh <= self._min_energy_kwh
    
    def charge(self, energy_kwh) -> float:
        """
        Charge battery with given energy, accounting for efficiency losses.
        
        Physical process:
        1. Energy enters battery from source (e.g., solar panel)
        2. Some energy is lost as heat during charging (efficiency < 100%)
        3. Remaining energy is stored in battery
        4. Method returns how much was TAKEN from source
    
        Args:
            energy_kwh (float): Energy offered to battery in kWh
        
        Returns:
            float: Energy actually CONSUMED from source (including losses)
                   This equals energy_stored / efficiency
                   
        Example:
            >>> battery = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=0.05)
            >>> consumed = battery.charge(10.0)  # Offer 10 kWh
            >>> # Battery stores: 10 × 0.9487 = 9.487 kWh
            >>> # Returns consumed: 9.487 kWh (what it took from source)
            >>> # Efficiency loss: 10 - 9.487 = 0.513 kWh (lost as heat)
        """
        # Step 1: Calculate how much energy can be stored after efficiency
        usable_energy = energy_kwh * self._one_way_efficiency
        
        # Step 2: Check available space in battery
        space_available = self._capacity_kwh - self._energy_kwh
        
        # Step 3: Calculate actual energy that will be stored
        # (limited by available space)
        energy_to_store = min(usable_energy, space_available)
        
        # Step 4: Calculate how much energy was CONSUMED from source
        # This is the inverse operation: stored / efficiency
        energy_consumed_from_source = energy_to_store / self._one_way_efficiency
        
        # Step 5: Update battery state
        self._energy_kwh += energy_to_store
        
        # Step 6: Return energy consumed from source (NOT stored energy)
        # This way, rejected_energy in EMS = only capacity rejection,
        # not efficiency losses
        return energy_consumed_from_source
    
    def discharge(self, energy_kwh) -> float:
        """
        Discharge battery by given energy, accounting for efficiency losses.
        
        Physical process:
        1. Energy is requested from battery
        2. More energy must be extracted than delivered (efficiency < 100%)
        3. Some energy is lost as heat during discharge
        4. Net energy is delivered to load

        Args:
            energy_kwh (float): Energy requested from battery in kWh

        Returns:
            float: Actual energy supplied (may be less if battery is low)
            
        Example:
            >>> battery = Battery(capacity_kwh=13.5, efficiency=0.9, min_soc=0.05)
            >>> battery._energy_kwh = 10.0  # 10 kWh stored
            >>> supplied = battery.discharge(5.0)  # Request 5 kWh
            >>> # Must extract: 5 / 0.9487 = 5.27 kWh from battery
            >>> # Delivers: 5.0 kWh to load
            >>> # Efficiency loss: 0.27 kWh (lost as heat)
        """
        # Step 1: Calculate energy needed from battery accounting for efficiency
        # To deliver X kWh, we need to extract X/η kWh from battery
        required_energy = energy_kwh / self._one_way_efficiency

        # Step 2: Calculate maximum available energy (respecting min_soc)
        max_available = self._energy_kwh - self._min_energy_kwh

        # Step 3: Calculate actual energy that can be extracted
        actual_extracted = min(required_energy, max_available)

        # Step 4: Update battery energy
        self._energy_kwh -= actual_extracted

        # Step 5: Calculate actual energy supplied after efficiency losses
        supplied = actual_extracted * self._one_way_efficiency

        return supplied
    
    def get_capacity(self) -> float:
        """Get total battery capacity in kWh."""
        return self._capacity_kwh
    
    def get_stored_energy(self) -> float:
        """Get current stored energy in kWh."""
        return self._energy_kwh
    
    def get_available_space(self) -> float:
        """Get available space for charging in kWh."""
        return self._capacity_kwh - self._energy_kwh

     