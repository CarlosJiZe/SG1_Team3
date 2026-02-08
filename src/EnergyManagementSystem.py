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

    def distribute_energy(self, solar_kw, load_kw, battery, grid):
        """
        Distribute energy according to the selected strategy.
        
        Args:
            solar_kw (float): Available solar power in kW
            load_kw (float): House load demand in kW
            battery (Battery): Battery object
            grid (Grid): Grid object
            
        Returns:
            dict: Energy flows for logging {
                'solar_to_load': ...,
                'solar_to_battery': ...,
                'solar_to_grid': ...,
                'battery_to_load': ...,
                'grid_to_load': ...,
                'unmet_load': ...
            }
        """
        
        if self._strategy == 'LOAD_PRIORITY':
            return self._load_priority(solar_kw, load_kw, battery, grid)
        
        elif self._strategy == 'CHARGE_PRIORITY':
            return self._charge_priority(solar_kw, load_kw, battery, grid)
        
        elif self._strategy == 'PRODUCE_PRIORITY':
            return self._produce_priority(solar_kw, load_kw, battery, grid)
        
        else:
            raise ValueError(f"Unknown strategy: {self._strategy}")

# ==============================LOAD_PRIORITY==========================================

    def _load_priority(self, solar_kw, load_kw, battery, grid):
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
        
        Returns:
            dict: Energy flows
        """
        # Initialize all energy flows
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        
        # ========== CASE 1: Solar >= Load (excess available) ==========
        if solar_kw >= load_kw:
            # Step 1: Cover load with solar
            solar_to_load = load_kw
            excess = solar_kw - load_kw
            
            # Step 2: Charge battery with excess
            if excess > 0:
                charged = battery.charge(excess)
                solar_to_battery = charged
                excess -= charged
            
            # Step 3: Export remaining excess to grid
            if excess > 0:
                exported = grid.export_energy(excess)
                solar_to_grid = exported
        
        # ========== CASE 2: Solar < Load (deficit) ==========
        else:
            # Step 1: Use all available solar
            solar_to_load = solar_kw
            deficit = load_kw - solar_kw
            
            # Step 2: Try to cover deficit with battery
            if deficit > 0:
                discharged = battery.discharge(deficit)
                battery_to_load = discharged
                deficit -= discharged
            
            # Step 3: Import from grid if still needed
            if deficit > 0:
                grid.import_energy(deficit)
                grid_to_load = deficit

        # Apply curtailment if enabled
        curtailed = 0.0
        if battery.is_full() and solar_to_grid > 0:
        # Battery is full and would export
        # Instead, curtail (don't generate) that excess solar
            curtailed = solar_to_grid
            solar_to_grid = 0.0
        
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

    def _charge_priority(self, solar_kw, load_kw, battery, grid):
        """
        CHARGE_PRIORITY: Battery first, house second, grid export last.
        
        Priority when solar available:
        1. Charge battery
        2. Cover house load excess
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
            
        Returns:
            dict: Energy flows

        """    
        
        # Initialize flows
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        
        # ========== CASE 1: Solar >= Load ==========
        if solar_kw >= load_kw:
            # Step 1: Charge battery FIRST with all solar
            charged = battery.charge(solar_kw)
            solar_to_battery = charged
            solar_remaining = solar_kw - charged
            
            # Step 2: Use remaining solar for house
            if solar_remaining >= load_kw:
                # Remaining solar covers load completely
                solar_to_load = load_kw
                excess = solar_remaining - load_kw
                
                # Step 3: Export excess
                if excess > 0:
                    exported = grid.export_energy(excess)
                    solar_to_grid = exported
            else:
                # Remaining solar doesn't cover load
                solar_to_load = solar_remaining
                deficit = load_kw - solar_remaining
                
                # Import from grid to cover deficit
                grid.import_energy(deficit)
                grid_to_load = deficit
        
        # ========== CASE 2: Solar < Load ==========
        else:
            # Use all solar for load (don't charge when in deficit)
            solar_to_load = solar_kw
            deficit = load_kw - solar_kw
            
            #Use battery as backup (same as LOAD_PRIORITY)
            if deficit > 0:
                discharged = battery.discharge(deficit)
                battery_to_load = discharged
                deficit -= discharged
            
            # Import from grid if still needed
            if deficit > 0:
                grid.import_energy(deficit)
                grid_to_load = deficit

        # Apply curtailment if enabled
        curtailed = 0.0
        if battery.is_full() and solar_to_grid > 0:
                curtailed = solar_to_grid
                solar_to_grid = 0.0
                    
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

    def _produce_priority(self, solar_kw, load_kw, battery, grid):
        """
        PRODUCE_PRIORITY: Grid export first, battery second, house last.
        
        Priority:
        1. Export all solar to grid (up to 20 kW limit)
        2. Charge battery with remaining solar (if any)
        3. Power house with remaining solar (if any)
        4. Cover house deficit from battery, then grid
        """
        solar_to_load = 0.0
        solar_to_battery = 0.0
        solar_to_grid = 0.0
        battery_to_load = 0.0
        grid_to_load = 0.0
        
        # Step 1: Export ALL solar to grid (up to limit)
        exported = grid.export_energy(solar_kw)
        solar_to_grid = exported
        solar_remaining = solar_kw - exported
        
        # Step 2: Charge battery with remaining solar (if any)
        if solar_remaining > 0:
            charged = battery.charge(solar_remaining)
            solar_to_battery = charged
            solar_remaining -= charged
        
        # Step 3: Power house with remaining solar (if any)
        if solar_remaining > 0:
            solar_to_load = min(solar_remaining, load_kw)
            deficit = load_kw - solar_to_load
        else:
            # No solar left for house
            deficit = load_kw
        
        # Step 4: Cover house deficit from battery
        if deficit > 0:
            discharged = battery.discharge(deficit)
            battery_to_load = discharged
            deficit -= discharged
        
        # Step 5: Import from grid if still needed
        if deficit > 0:
            grid.import_energy(deficit)
            grid_to_load = deficit

        # Apply curtailment if enabled
        curtailed = 0.0
        if battery.is_full() and solar_to_grid > 0:
            curtailed = solar_to_grid
            solar_to_grid = 0.0
        
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