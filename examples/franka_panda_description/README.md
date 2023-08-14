# franka_panda_desctiption

Robot description package modified from [*franka_ros*](https://frankaemika.github.io/docs/franka_ros.html) package to include dynamics parameters for the robot arm and gripper for simulating the behaviour of the real robot. The descriptions also include transmission and control definitions required for Gazebo support (see [*panda_simulator*](https://github.com/justagist/panda_simulator) package).

Robot dynamics values are as estimated in [this paper](https://hal.inria.fr/hal-02265293/document).

## Special Thanks

- [@qgallouedec](https://github.com/qgallouedec):
  - Improved visual meshes ([see image](https://raw.githubusercontent.com/qgallouedec/franka_panda_description/master/assets/panda.jpeg))
  - Modified collision spaces using more accurate collision meshes (mesh files are from [AndrejOrsula](https://github.com/AndrejOrsula/panda_ign)) ([see image](https://raw.githubusercontent.com/qgallouedec/franka_panda_description/master/assets/collision.jpeg))
  - ~~Improved inertia values of robot arm (values from [mkrizmancic's repo](https://github.com/mkrizmancic/franka_gazebo)) ([see image](https://raw.githubusercontent.com/qgallouedec/franka_panda_description/master/assets/inertia.jpeg))~~ This is not being used anymore due to unstable dynamics in simulator issues (see [#5](https://github.com/justagist/franka_panda_description/issues/5)).
  - Added more realistic mass and inertia values for robot gripper (values from [mkrizmancic's repo](https://github.com/mkrizmancic/franka_gazebo))
- [@MichaelSinsbeck](https://github.com/MichaelSinsbeck):
  - Improved gripper friction values for making motion more like the real robot

## Related Packages
- [*panda_simulator*](https://github.com/justagist/panda_simulator) : Simulation in Gazebo with exposed controllers and state feedback using ROS topics and services. The simulated robot uses the same ROS topics and services as the real robot when using the [*franka_ros_interface*](https://github.com/justagist/franka_ros_interface).
- [*franka_ros_interface*](https://github.com/justagist/franka_ros_interface) : A ROS API for controlling and managing the Franka Emika Panda robot (real and simulated). Contains controllers for the robot (joint position, velocity, torque), interfaces for the gripper, controller manager, coordinate frames interface, etc.. Provides almost complete sim-to-real transfer of code.
- [*panda_robot*](https://github.com/justagist/panda_robot) : Python interface providing higher-level control of the robot integrated with its gripper, controller manager, coordinate frames manager, etc. It also provides access to the kinematics and dynamics of the robot using the [KDL library](http://wiki.ros.org/kdl).
