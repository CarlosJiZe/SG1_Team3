class EnergyManagementSystem:
    """
    Manages energy distribution according to different priority strategies.
    
    This is the "brain" of the system that decides:
    - Where does solar energy go?
    - Where does deficit energy come from?
    """
    
    def __init__(self, strategy='LOAD_PRIORITY'):
        """
        Initialize the energy management system.
        
        Args:
            strategy (str): Priority strategy to use
                - 'LOAD_PRIORITY': House first, battery second, grid last
                - 'CHARGE_PRIORITY': Battery first, house second, grid last
                - 'PRODUCE_PRIORITY': Grid export first, battery second, house last
        """
        self._strategy = strategy

    def distribute_energy(self, solar_kw, load_kw, battery, grid, time_step_hours=1.0):
        """
        Distribute energy according to the selected strategy.
        
        Args:
            solar_kw (float): Available solar power in kW
            load_kw (float): House load demand in kW
            battery (Battery): Battery object
            grid (Grid): Grid object
            time_step_hours (float): Duration of time step in hours
            
        Returns:
            dict: Energy flows for logging {
                'solar_to_load': ...,
                'solar_to_battery': ...,
                'solar_to_grid': ...,
                'battery_to_load': ...,
                'grid_to_load': ...,
                'unmet_load': ...,
                'curtailed': ...
            }
        """
        if self._strategy == 'LOAD_PRIORITY':
            return self._load_priority(solar_kw, load_kw, battery, grid, time_step_hours)
        
        elif self._strategy == 'CHARGE_PRIORITY':
            return self._charge_priority(solar_kw, load_kw, battery, grid, time_step_hours)
        
        elif self._strategy == 'PRODUCE_PRIORITY':
            return self._produce_priority(solar_kw, load_kw, battery, grid, time_step_hours)
        
        else:
            raise ValueError(f"Unknown strategy: {self._strategy}")

# ==============================LOAD_PRIORITY==========================================

    def _load_priority(self, solar_kw, load_kw, battery, grid, time_step_hours):
        """
        LOAD_PRIORITY: House first, battery second, grid export last.
    
        Priority when solar available:
        1. Cover house load
        2. Charge battery with excess
        3. Export remaining to grid
    
        Priority when solar insufficient:
        1. Use all available solar
        2. Discharge battery to cover deficit
        3. Import from grid if still needed
    
        Args:
            solar_kw (float): Available solar power
            load_kw (float): House demand
            battery (Battery): Battery object
            grid (Grid): Grid object
            time_step_hours (float): Duration of time step in hours
        
        Returns:
            dict: Energy flows
        """
        # Initialize all energy flows
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        curtailed = 0.0
        
        # ========== CASE 1: Solar >= Load (excess available) ==========
        if solar_kw >= load_kw:
            # Step 1: Cover load with solar
            solar_to_load = load_kw
            excess = solar_kw - load_kw
            
            # Step 2: Try to charge battery with excess
            if excess > 0:
                # Offer all excess to battery
                offered_energy = excess * time_step_hours
                charged_energy = battery.charge(offered_energy)
                
                # Report consumed power (what battery took from source)
                solar_to_battery = charged_energy / time_step_hours
                
                # Calculate what was NOT accepted by battery
                rejected_energy = offered_energy - charged_energy
                remaining_power = rejected_energy / time_step_hours
                
                # Update excess to only what wasn't used
                excess = remaining_power
            
            # Step 3: Export remaining excess to grid
            if excess > 0:
                exported = grid.export_energy(excess, time_step_hours)
                solar_to_grid = exported
                
                # Curtail only if grid couldn't accept all
                # (e.g., if export limit was reached)
                if exported < excess:
                    curtailed = excess - exported
        
        # ========== CASE 2: Solar < Load (deficit) ==========
        else:
            # Step 1: Use all available solar
            solar_to_load = solar_kw
            deficit = load_kw - solar_kw
            
            # Step 2: Try to cover deficit with battery
            if deficit > 0:
                requested_energy = deficit * time_step_hours
                discharged_energy = battery.discharge(requested_energy)
                discharged_power = discharged_energy / time_step_hours
                battery_to_load = discharged_power
                
                # Update deficit
                deficit -= discharged_power
            
            # Step 3: Import from grid if still needed
            if deficit > 0:
                grid.import_energy(deficit, time_step_hours)
                grid_to_load = deficit
        
        # Unmet load = energy that internal system (solar+battery) couldn't provide
        # This equals the energy we had to import from grid
        unmet_load = grid_to_load
        
        return {
            'solar_to_load': round(solar_to_load, 6),
            'solar_to_battery': round(solar_to_battery, 6),
            'solar_to_grid': round(solar_to_grid, 6),
            'battery_to_load': round(battery_to_load, 6),
            'grid_to_load': round(grid_to_load, 6),
            'unmet_load': round(unmet_load, 6),
            'curtailed': round(curtailed, 6)
        }
        
# ==============================CHARGE_PRIORITY==========================================

    def _charge_priority(self, solar_kw, load_kw, battery, grid, time_step_hours):
        """
        CHARGE_PRIORITY: Battery first, house second, grid export last.
        
        Priority when solar available:
        1. Charge battery
        2. Cover house load with excess
        3. Export remaining to grid
    
        Priority when solar insufficient:
        1. Use all available solar
        2. Discharge battery to cover deficit
        3. Import from grid if still needed

        Args:
            solar_kw (float): Available solar power
            load_kw (float): House demand
            battery (Battery): Battery object
            grid (Grid): Grid object
            time_step_hours (float): Duration of time step in hours
            
        Returns:
            dict: Energy flows
        """    
        # Initialize flows
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        curtailed = 0.0
        
        # ========== CASE 1: Solar >= Load ==========
        if solar_kw >= load_kw:
            # Step 1: Charge battery FIRST with all solar
            offered_energy = solar_kw * time_step_hours
            charged_energy = battery.charge(offered_energy)
            solar_to_battery = charged_energy / time_step_hours
            
            # Calculate remaining solar after charging
            rejected_energy = offered_energy - charged_energy
            solar_remaining = rejected_energy / time_step_hours
            
            # Step 2: Use remaining solar for house
            if solar_remaining >= load_kw:
                # Remaining solar covers load completely
                solar_to_load = load_kw
                excess = solar_remaining - load_kw
                
                # Step 3: Export excess
                if excess > 0:
                    exported = grid.export_energy(excess, time_step_hours)
                    solar_to_grid = exported
                    
                    # Curtail if grid limit reached
                    if exported < excess:
                        curtailed = excess - exported
            else:
                # Remaining solar doesn't cover load
                solar_to_load = solar_remaining
                deficit = load_kw - solar_remaining
                
                # Import from grid to cover deficit
                grid.import_energy(deficit, time_step_hours)
                grid_to_load = deficit
        
        # ========== CASE 2: Solar < Load ==========
        else:
            # Use all solar for load (don't charge when in deficit)
            solar_to_load = solar_kw
            deficit = load_kw - solar_kw
            
            # Use battery as backup (same as LOAD_PRIORITY)
            if deficit > 0:
                requested_energy = deficit * time_step_hours
                discharged_energy = battery.discharge(requested_energy)
                discharged_power = discharged_energy / time_step_hours
                battery_to_load = discharged_power
                deficit -= discharged_power
            
            # Import from grid if still needed
            if deficit > 0:
                grid.import_energy(deficit, time_step_hours)
                grid_to_load = deficit
        
        unmet_load = grid_to_load
        
        return {
            'solar_to_load': round(solar_to_load, 6),
            'solar_to_battery': round(solar_to_battery, 6),
            'solar_to_grid': round(solar_to_grid, 6),
            'battery_to_load': round(battery_to_load, 6),
            'grid_to_load': round(grid_to_load, 6),
            'unmet_load': round(unmet_load, 6),
            'curtailed': round(curtailed, 6)
        }

# ==============================PRODUCE_PRIORITY==========================================

    def _produce_priority(self, solar_kw, load_kw, battery, grid, time_step_hours):
        """
        PRODUCE_PRIORITY: Grid export first, battery second, house last.
        
        Priority:
        1. Export all solar to grid (up to 20 kW limit)
        2. Charge battery with remaining solar (if any)
        3. Power house with remaining solar (if any)
        4. Cover house deficit from battery, then grid
        
        Args:
            solar_kw (float): Available solar power
            load_kw (float): House demand
            battery (Battery): Battery object
            grid (Grid): Grid object
            time_step_hours (float): Duration of time step in hours
            
        Returns:
            dict: Energy flows
        """
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        curtailed = 0.0
        
        # Step 1: Export ALL solar to grid (up to limit)
        exported = grid.export_energy(solar_kw, time_step_hours)
        solar_to_grid = exported
        solar_remaining = solar_kw - exported
        
        # Curtail if grid limit was reached
        if exported < solar_kw:
            # Some solar couldn't be exported due to grid limit
            # This solar_remaining will be used for battery/load
            pass
        
        # Step 2: Charge battery with remaining solar (if any)
        if solar_remaining > 0:
            offered_energy = solar_remaining * time_step_hours
            charged_energy = battery.charge(offered_energy)
            solar_to_battery = charged_energy / time_step_hours
            
            # Calculate what wasn't used
            rejected_energy = offered_energy - charged_energy
            solar_remaining = rejected_energy / time_step_hours
        
        # Step 3: Power house with remaining solar (if any)
        if solar_remaining > 0:
            solar_to_load = min(solar_remaining, load_kw)
            deficit = load_kw - solar_to_load
            
            # Curtail any final excess
            if solar_remaining > solar_to_load:
                curtailed = solar_remaining - solar_to_load
        else:
            # No solar left for house
            deficit = load_kw
        
        # Step 4: Cover house deficit from battery
        if deficit > 0:
            requested_energy = deficit * time_step_hours
            discharged_energy = battery.discharge(requested_energy)
            discharged_power = discharged_energy / time_step_hours
            battery_to_load = discharged_power
            deficit -= discharged_power
        
        # Step 5: Import from grid if still needed
        if deficit > 0:
            grid.import_energy(deficit, time_step_hours)
            grid_to_load = deficit
        
        unmet_load = grid_to_load
        
        return {
            'solar_to_load': round(solar_to_load, 6),
            'solar_to_battery': round(solar_to_battery, 6),
            'solar_to_grid': round(solar_to_grid, 6),
            'battery_to_load': round(battery_to_load, 6),
            'grid_to_load': round(grid_to_load, 6),
            'unmet_load': round(unmet_load, 6),
            'curtailed': round(curtailed, 6)
        }