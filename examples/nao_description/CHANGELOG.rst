^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
Changelog for package nao_description
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

0.5.15 (2016-11-23)
-------------------

0.5.14 (2016-01-23)
-------------------
* removed nao_dcm namespace to match changes made to nao_control
* added gui:=true to match pepper_description display.launch
* Contributors: Mikael Arguedas

0.5.13 (2016-01-16)
-------------------
* Fix bad arm values.
  This fixes `#25 <https://github.com/ros-naoqi/nao_robot/issues/25>`_.
* Contributors: Vincent Rabaud

0.5.12 (2016-01-01)
-------------------
* remove type from naoTransmission
* update the Gazebo .xacro and the corresponding .urdf
* update the .xacro / .urdf to the latest version of naoqi_tools
* Contributors: Mikael Arguedas, Vincent Rabaud

0.5.11 (2015-08-11)
-------------------

0.5.10 (2015-07-31)
-------------------

0.5.9 (2015-07-30)
------------------

0.5.8 (2015-07-30)
------------------

0.5.7 (2015-03-27)
------------------
* update full .urdf file using xacro
* fixed ankle drift
* Contributors: Mikael Arguedas, Vincent Rabaud

0.5.6 (2015-02-27)
------------------
* properly fix 535d34474d9f64ddb60f6f163656c10fcdf92774
  The automatic generator was used to generate inertia
* dirty fix for naoqi_bridge/issues/31
* Minor fix to load RViz config file in display.launch
* fixing typo
* Cleanup and rename launch files
* Contributors: Karsten Knese, Konstantinos Chatzilygeroudis, Mikael Arguedas, Vincent Rabaud

0.5.5 (2015-02-17)
------------------
* update to the latest version of the generation script
* Contributors: Vincent Rabaud

0.5.4 (2015-02-17)
------------------
* restore sensor in naoGazebo.xacro
* Contributors: Mikael Arguedas

0.5.3 (2014-12-14)
------------------

0.5.2 (2014-12-04)
------------------
* fixed gazebo tags used by nao_gazebo_plugin
* remove trailing spaces
* update generated urdf files, add gazebo plugins
* Added xacro and urdf dependencies
* Contributors: Arguedas Mikael, Mikael ARGUEDAS

0.5.1 (2014-11-13)
------------------

0.5.0 (2014-11-06)
------------------
* transfer nao_robot
* 0.4.1
* update changelogs
* added camera and sonar to naoGazebo.xacro
* get the accent right in Séverin's name
* 0.4.0
* update changelogs
* urdf generated files, launchfiles and config files
  generated files updated
  updated mesh file path
  add xacro macro for fingers in naohands
  update nao.urdf based on new macros for fingers
  export with meshes
  remove useless imu frame
* 0.3.0
* update changelogs
* update maintainers
  Armin, thank you for all your work, in ROS, Octomap and NAO.
  Good luck out of the university !
* Revert "Merge pull request `#26 <https://github.com/ros-naoqi/nao_robot/issues/26>`_ from vrabaud/fix_xacro"
  Breaks groovy (xacro no catkin package), but will be required from hydro on
  This reverts commit 321424a634a309ea9c284cf027074cdeda2a3c67, reversing
  changes made to 383d285e01997e585bfa731525ce5f17a6cc3165.
* fix the missing dependency on xacro
* "0.2.3"
* Changelogs
* {ahornung->ros-nao}
* {ahornung->ros-nao}
* Fix `#17 <https://github.com/ros-naoqi/nao_robot/issues/17>`_: add dependency on sensor_msgs in nao_description
* "0.2.2"
* changelog
* "0.2.1"
* Changelogs
* [nao_description] Added missing include dirs in CMakeLists
* "0.2.0"
* Adding (edited) catkin-generated changelogs
* Adding bugtracker and repo URLs to package manifests
* Adding base_footprint node to nao_description, publishes footprint according
  to REP-120 (based on previous node nao_remote/remap_odometry). Fixes Issue `#10 <https://github.com/ros-naoqi/nao_robot/issues/10>`_.
* Moved nao_description from nao_common to nao_robot
* Contributors: Armin Hornung, Karsten Knese, Séverin Lemaignan, Vincent Rabaud, margueda
