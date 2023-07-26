cmake_minimum_required(VERSION 2.8.3)
project(nao_description)

# We need to find catkin for the rest of the script to work
find_package(catkin REQUIRED COMPONENTS
  roscpp
  tf
  message_filters
  sensor_msgs
)

# Nothing that can be imported by other modules
catkin_package()

include_directories(${catkin_INCLUDE_DIRS})
add_executable(base_footprint src/base_footprint.cpp)
target_link_libraries(base_footprint ${catkin_LIBRARIES})

install(TARGETS base_footprint
    RUNTIME DESTINATION ${CATKIN_PACKAGE_BIN_DESTINATION} )

# Instructions to install launch files
install(DIRECTORY launch/
    DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}/launch )

# Instructions to install urdf files
install(DIRECTORY urdf/
    DESTINATION ${CATKIN_PACKAGE_SHARE_DESTINATION}/urdf)

