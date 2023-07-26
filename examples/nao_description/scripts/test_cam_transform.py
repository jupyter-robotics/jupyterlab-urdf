#!/usr/bin/env python
import sys
import roslib
roslib.load_manifest('nao_description')
import rospy
import tf
import numpy as np
from tf import TransformListener
from tf import transformations

try:
    import motion
    from naoqi import ALProxy
except ImportError:
    print("Error importing NaoQI. Please make sure that Aldebaran's NaoQI API is in your PYTHONPATH.")
    exit(1)


# bla
def space_to_str(space):
        if space == motion.SPACE_TORSO:
                return "Torso"
        elif space == motion.SPACE_WORLD:
                return "Odom"
        elif space == motion.SPACE_NAO:
                return "BaseFootprint"

def transform_to_str(result):
        tstr = ''
        maxColumnWidth = 20
        for i in range(0,4):
                row = result[4*i:4*i+4]
                rstr = ''.join(["%s" %str(k).center(maxColumnWidth) for k in (row)] )
                rstr = rstr + '\n'
                tstr = tstr+rstr
                #tstr.append('\n')
        return tstr

def np_mat_to_str(m):
    mm = list()
    for i in range(0,4):
        for j in range(0,4):
            mm.append(m[i,j])

    return transform_to_str(mm)

def cam_rotation_matrix():
    return np.matrix('0 0 1 0;-1 0 0 0; 0 -1 0 0; 0 0 0 1')

if __name__ == '__main__':
        rospy.init_node('test_tf')
        listener = TransformListener()
        ip = "ra.local"
        port = 9559
        proxy = ALProxy("ALMotion", ip, port)
        print "motionproxy ready"
        space = motion.SPACE_TORSO
        chainName = "Head"
        currentSensor = proxy.getPosition(chainName, space, True)
        current = proxy.getPosition(chainName, space, False)
        print "Position of %s in space %s:"%(chainName, space_to_str(space))
        print currentSensor
        print current
        rpy = currentSensor[3:]
        print rpy
        DCM = apply(transformations.euler_matrix,rpy)
        print DCM
        tTHSensor = proxy.getTransform(chainName, space, True)
        tTH = proxy.getTransform(chainName, space, False)
        print "Transform %s to %s:"%(space_to_str(space),chainName)
        print transform_to_str(tTHSensor)
        #print transform_to_str(tTH)
        chainName = "CameraTop"
        tTCSensor = proxy.getTransform(chainName, space, True)
        tTC = proxy.getTransform(chainName, space, False)
        print "Transform %s to %s:"%(space_to_str(space),chainName)
        print transform_to_str(tTCSensor)
        print
        T = np.matrix([tTCSensor[0:4],tTCSensor[4:8],tTCSensor[8:12],tTCSensor[12:]])
        #print cam_rotation_matrix()
        DCM = T*cam_rotation_matrix()
        print "Transform %s to %s (with rotated coordinate frame):"%(space_to_str(space),chainName)
        print np_mat_to_str(DCM)

        stamp = rospy.Time()
        frame1 = 'Torso_link'
        frame2 = 'CameraTop_frame'
        try:
            listener.waitForTransform(frame1,frame2,stamp,rospy.Duration(1.0))
            (trans,rot) = listener.lookupTransform(frame1,frame2,stamp)
        except tf.Exception as e:
            print "ERROR using TF"
            print "%s"%(e)
            sys.exit(-1)

        m = transformations.quaternion_matrix(rot)
        for i in range(0,3):
            m[i,3] = trans[i]
        print "[tf] Transform %s to %s:"%(frame1,frame2)
        print np_mat_to_str(m)

        e = np.linalg.norm(DCM - m)
        print "Error is: ",e
        if e > 1e-5:
            print "ERROR: Something is wrong with your TF transformations.  Transforms do not match!"
        else:
            print "Test ok. Done"


