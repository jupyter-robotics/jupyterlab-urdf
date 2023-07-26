
/*
 * Publish the Nao humanoid's base_footprint frame according to REP-120
 * Based on nao_common/remap_odometry.cpp
 *
 * Copyright 2013 Armin Hornung, Stefan Osswald, University of Freiburg
 * http://www.ros.org/wiki/nao
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright
 *       notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright
 *       notice, this list of conditions and the following disclaimer in the
 *       documentation and/or other materials provided with the distribution.
 *     * Neither the name of the University of Freiburg nor the names of its
 *       contributors may be used to endorse or promote products derived from
 *       this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

#include <ros/ros.h>
#include <message_filters/subscriber.h>
#include <tf/transform_broadcaster.h>
#include <tf/transform_datatypes.h>
#include <tf/transform_listener.h>
#include <tf/message_filter.h>
#include <sensor_msgs/JointState.h>

class BaseFootprint
{
public:
	BaseFootprint();
	~BaseFootprint();


private:
  void jsCallback(const sensor_msgs::JointState::ConstPtr & msg);

  ros::NodeHandle m_nh;
  ros::NodeHandle m_privateNh;

  // for base_footprint_frame: broadcasts frame between right and left foot, coinciding with the ground
  message_filters::Subscriber<sensor_msgs::JointState> * m_jsSub;
  tf::MessageFilter<sensor_msgs::JointState> * m_jsFilter;
  tf::TransformBroadcaster m_brBaseFootPrint;
  tf::TransformListener m_listener;

  std::string m_odomFrameId;
  std::string m_baseFrameId;
  std::string m_lfootFrameId;
  std::string m_rfootFrameId;
  std::string m_baseFootPrintID;

};

BaseFootprint::BaseFootprint()
  : m_privateNh("~"), m_odomFrameId("odom"), m_baseFrameId("base_link"),
    m_lfootFrameId("l_sole"), m_rfootFrameId("r_sole"),
    m_baseFootPrintID("base_footprint")
{
  // Read parameters
  m_privateNh.param("odom_frame_id", m_odomFrameId, m_odomFrameId);
  m_privateNh.param("base_frame_id", m_baseFrameId, m_baseFrameId);
  m_privateNh.param("base_footprint_frame_id", m_baseFootPrintID, m_baseFootPrintID);


  // Resolve TF frames using ~tf_prefix parameter

  m_odomFrameId = m_listener.resolve(m_odomFrameId);
  m_baseFrameId = m_listener.resolve(m_baseFrameId);
  m_baseFootPrintID = m_listener.resolve(m_baseFootPrintID);
  m_lfootFrameId = m_listener.resolve(m_lfootFrameId);
  m_rfootFrameId = m_listener.resolve(m_rfootFrameId);

  // subscribe to joint_states to provide a clock signal for synchronization
  // since the frames are computed based on the joint state, all should be available
  // with the same time stamps
  m_jsSub = new message_filters::Subscriber<sensor_msgs::JointState>(m_nh, "joint_states", 50);
  m_jsFilter = new tf::MessageFilter<sensor_msgs::JointState>(*m_jsSub, m_listener, m_rfootFrameId, 50);
  std::vector<std::string> frames;
  frames.push_back(m_rfootFrameId);
  frames.push_back(m_odomFrameId);
  m_jsFilter->setTargetFrames(frames);
  m_jsFilter->registerCallback(boost::bind(&BaseFootprint::jsCallback, this, _1));
}

BaseFootprint::~BaseFootprint(){
  delete m_jsFilter;
  delete m_jsSub;
}

void BaseFootprint::jsCallback(const sensor_msgs::JointState::ConstPtr & ptr)
{
  ros::Time time = ptr->header.stamp;
  tf::StampedTransform tf_odom_to_base, tf_odom_to_left_foot, tf_odom_to_right_foot;

  ROS_DEBUG("JointState callback function, computing frame %s", m_baseFootPrintID.c_str());
  try {
    m_listener.lookupTransform(m_odomFrameId, m_lfootFrameId, time, tf_odom_to_left_foot);
    m_listener.lookupTransform(m_odomFrameId, m_rfootFrameId, time, tf_odom_to_right_foot);
    m_listener.lookupTransform(m_odomFrameId, m_baseFrameId,  time, tf_odom_to_base);
  } catch (const tf::TransformException& ex){
    ROS_ERROR("%s",ex.what());
    return ;
  }

  tf::Vector3 new_origin = (tf_odom_to_right_foot.getOrigin() + tf_odom_to_left_foot.getOrigin())/2.0; // middle of both feet
  double height = std::min(tf_odom_to_left_foot.getOrigin().getZ(), tf_odom_to_right_foot.getOrigin().getZ()); // fix to lowest foot
  new_origin.setZ(height);

  // adjust yaw according to torso orientation, all other angles 0 (= in z-plane)
  double roll, pitch, yaw;
  tf_odom_to_base.getBasis().getRPY(roll, pitch, yaw);

  tf::Transform tf_odom_to_footprint(tf::createQuaternionFromYaw(yaw), new_origin);
  tf::Transform tf_base_to_footprint = tf_odom_to_base.inverse() * tf_odom_to_footprint;

  // publish transform with parent m_baseFrameId and new child m_baseFootPrintID
  // i.e. transform from m_baseFrameId to m_baseFootPrintID
  m_brBaseFootPrint.sendTransform(tf::StampedTransform(tf_base_to_footprint, time, m_baseFrameId, m_baseFootPrintID));
  ROS_DEBUG("Published Transform %s --> %s", m_baseFrameId.c_str(), m_baseFootPrintID.c_str());

  return;

}

int main(int argc, char** argv){
  ros::init(argc, argv, "base_footprint");
  BaseFootprint baseFootprint;
  ros::spin();

  return 0;
}


