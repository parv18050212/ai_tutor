# JEE Class 12 Physics - Key Concepts

This document contains key concepts from Electrostatics, Current Electricity, and Modern Physics, designed for JEE preparation.

## Unit 1: Electrostatics

### Coulomb's Law
This law describes the force between two stationary point charges. The force is directly proportional to the product of the magnitudes of the charges and inversely proportional to the square of the distance between them.
The formula in vector form is:
$$ \vec{F} = \frac{1}{4\pi\epsilon_0} \frac{q_1q_2}{r^2} \hat{r} $$
Where:
- $\epsilon_0$ is the permittivity of free space.
- $q_1$ and $q_2$ are the point charges.
- $r$ is the distance between the charges.
- $\hat{r}$ is the unit vector along the line joining the charges.

### Electric Field
The electric field is a region around a charged particle or object within which a force would be exerted on other charged particles or objects. The electric field intensity ($\vec{E}$) at a point is defined as the force experienced by a unit positive test charge ($q_0$) placed at that point.
$$ \vec{E} = \frac{\vec{F}}{q_0} $$
The electric field due to a point charge $q$ is:
$$ \vec{E} = \frac{1}{4\pi\epsilon_0} \frac{q}{r^2} \hat{r} $$

### Gauss's Law
Gauss's law states that the total electric flux out of a closed surface (a "Gaussian surface") is equal to the net charge enclosed by that surface divided by the permittivity of free space.
$$ \Phi_E = \oint \vec{E} \cdot d\vec{A} = \frac{Q_{enclosed}}{\epsilon_0} $$
This law is extremely useful for calculating the electric field of symmetric charge distributions (like spheres, infinite lines, or infinite sheets).

### Electric Potential
Electric potential ($V$) at a point in an electric field is the amount of work done in moving a unit positive charge from infinity to that point without acceleration.
$$ V = \frac{W}{q_0} $$
The potential due to a point charge $q$ is:
$$ V = \frac{1}{4\pi\epsilon_0} \frac{q}{r} $$
Potential is a scalar quantity.

### Capacitance
A capacitor is a device that stores electrical energy in an electric field. Capacitance ($C$) is the ratio of the magnitude of the charge ($Q$) on either conductor to the magnitude of the potential difference ($V$) between them.
$$ C = \frac{Q}{V} $$
For a parallel plate capacitor, the capacitance is given by:
$$ C = \frac{\epsilon_0 A}{d} $$
Where $A$ is the area of the plates and $d$ is the distance between them.

---

## Unit 2: Current Electricity

### Ohm's Law
Ohm's law states that the current ($I$) flowing through a conductor is directly proportional to the potential difference ($V$) across its ends, provided the physical conditions (like temperature) remain unchanged.
$$ V = IR $$
Where $R$ is the resistance of the conductor, a constant of proportionality. Resistance depends on the material's resistivity ($\rho$), length ($L$), and cross-sectional area ($A$):
$$ R = \rho \frac{L}{A} $$

### Kirchhoff's Laws
These are two fundamental laws used to analyze complex electrical circuits.

#### 1. Kirchhoff's Current Law (KCL) - Junction Rule
The algebraic sum of currents entering any junction is zero. This is a statement of the conservation of charge.
$$ \sum I_{in} = \sum I_{out} $$

#### 2. Kirchhoff's Voltage Law (KVL) - Loop Rule
The algebraic sum of changes in potential around any closed circuit loop must be zero. This is a statement of the conservation of energy.
$$ \sum \Delta V_{loop} = 0 $$

---

## Unit 3: Modern Physics

### Photoelectric Effect
The photoelectric effect is the emission of electrons when electromagnetic radiation, such as light, hits a material.


**Einstein's Photoelectric Equation:**
This equation describes the energy balance for a single photon interacting with a single electron.
$$ K_{max} = hf - \phi_0 $$
Where:
- $K_{max}$ is the maximum kinetic energy of the emitted electron.
- $h$ is Planck's constant.
- $f$ is the frequency of the incident photon.
- $\phi_0$ is the **work function** of the material, which is the minimum energy required to remove an electron.
The **threshold frequency** ($f_0$) is the minimum frequency of light required to cause photoemission, where $hf_0 = \phi_0$.

### De Broglie Wavelength
Louis de Broglie proposed that all matter has wave-like properties. The wavelength associated with a particle is inversely proportional to its momentum.
$$ \lambda = \frac{h}{p} = \frac{h}{mv} $$
Where:
- $\lambda$ is the de Broglie wavelength.
- $h$ is Planck's constant.
- $p$ is the momentum of the particle ($p=mv$).

### Bohr's Model for the Hydrogen Atom
Bohr's model provides a simple description of the hydrogen atom, based on a few key postulates:
1.  Electrons revolve in stable, circular orbits called stationary states.
2.  An electron does not radiate energy while in a stationary state.
3.  The angular momentum of an electron in a stationary orbit is an integral multiple of $h/2\pi$. ($L = mvr = n\frac{h}{2\pi}$)
4.  An electron can transition between these states by absorbing or emitting a photon of energy equal to the energy difference between the states ($ \Delta E = E_{final} - E_{initial} = hf $).

**Energy of the nth orbit:**
$$ E_n = -13.6 \frac{Z^2}{n^2} \, \text{eV} $$
Where $n$ is the principal quantum number and $Z$ is the atomic number.